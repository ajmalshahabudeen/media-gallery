#!/usr/bin/env python3
import os
import sys
import json
import re
import socket
import mimetypes
from pathlib import Path
from datetime import datetime
from concurrent.futures import ProcessPoolExecutor, as_completed

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.heic', '.avif'}
VIDEO_EXTENSIONS = {'.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.m4v'}
AUDIO_EXTENSIONS = {'.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'}
MEDIA_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS | AUDIO_EXTENSIONS

class RedisClient:
    """Lightweight Python Redis client using standard TCP socket (RESP protocol)."""
    def __init__(self, host='127.0.0.1', port=6379, timeout=2.0):
        # Inside Docker, host might be 'redis'
        self.host = os.environ.get('REDIS_HOST', host)
        self.port = int(os.environ.get('REDIS_PORT', port))
        self.timeout = timeout
        self._sock = None

    def _connect(self):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            sock.connect((self.host, self.port))
            return sock
        except Exception:
            # Fallback to localhost if host name fails
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(self.timeout)
                sock.connect(('127.0.0.1', 6379))
                return sock
            except Exception:
                return None

    def set(self, key, value, ex=3600):
        """SET key value EX ex"""
        sock = self._connect()
        if not sock:
            return False
        try:
            val_bytes = value.encode('utf-8') if isinstance(value, str) else value
            cmd = f"*4\r\n$3\r\nSET\r\n${len(key)}\r\n{key}\r\n${len(val_bytes)}\r\n".encode('utf-8') + val_bytes + f"\r\n$2\r\nEX\r\n${len(str(ex))}\r\n{ex}\r\n".encode('utf-8')
            sock.sendall(cmd)
            resp = sock.recv(1024)
            sock.close()
            return b"+OK" in resp
        except Exception:
            return False

    def lpush(self, key, value):
        """LPUSH key value"""
        sock = self._connect()
        if not sock:
            return False
        try:
            val_bytes = value.encode('utf-8') if isinstance(value, str) else value
            cmd = f"*3\r\n$5\r\nLPUSH\r\n${len(key)}\r\n{key}\r\n${len(val_bytes)}\r\n".encode('utf-8') + val_bytes + b"\r\n"
            sock.sendall(cmd)
            sock.recv(1024)
            sock.close()
            return True
        except Exception:
            return False

def get_media_type(ext):
    ext = ext.lower()
    if ext in IMAGE_EXTENSIONS:
        return 'image'
    elif ext in VIDEO_EXTENSIONS:
        return 'video'
    elif ext in AUDIO_EXTENSIONS:
        return 'audio'
    return 'other'

def resolve_target_path(target_path):
    if os.path.exists(target_path):
        return target_path

    drive_match = re.match(r'^([a-zA-Z]):[/\\]?(.*)', target_path)
    if drive_match:
        drive_letter = drive_match.group(1).lower()
        subpath = drive_match.group(2).replace('\\', '/').strip('/')
        candidate_paths = [
            os.path.join(f"/host_drives/{drive_letter}", subpath),
            os.path.join("/host_media", subpath),
            os.path.join(f"/mnt/{drive_letter}", subpath),
            os.path.join(f"/{drive_letter}", subpath),
            "/host_media"
        ]
        for candidate in candidate_paths:
            if candidate and os.path.exists(candidate):
                return candidate

    if os.path.exists("/host_media"):
        return "/host_media"

    return target_path

def emit_progress(scanned_files, scanned_folders, current_folder, latest_file, redis_client=None):
    progress_data = {
        "scannedFiles": scanned_files,
        "scannedFolders": scanned_folders,
        "currentFolder": current_folder,
        "latestFile": latest_file
    }
    progress_json = json.dumps(progress_data)
    sys.stderr.write(f"PROGRESS:{progress_json}\n")
    sys.stderr.flush()

    if redis_client:
        redis_client.set("media_indexing_progress", progress_json, ex=60)
        redis_client.lpush("media_scan_queue", progress_json)

def scan_single_subfolder(args):
    """Worker function for ProcessPoolExecutor multiprocessing."""
    sub_root, target_path = args
    files_batch = []
    folders_batch = set()

    rel_folder = os.path.relpath(sub_root, target_path)
    if rel_folder != ".":
        folders_batch.add(rel_folder)

    current_rel = rel_folder if rel_folder != "." else "/"

    try:
        entries = os.scandir(sub_root)
        for entry in entries:
            if entry.is_file(follow_symlinks=False):
                ext = os.path.splitext(entry.name)[1].lower()
                if ext in MEDIA_EXTENSIONS:
                    try:
                        stat = entry.stat()
                        mime, _ = mimetypes.guess_type(entry.path)
                        files_batch.append({
                            "id": f"{entry.path}_{stat.st_mtime}",
                            "name": entry.name,
                            "path": entry.path,
                            "folder": current_rel,
                            "size": stat.st_size,
                            "extension": ext,
                            "type": get_media_type(ext),
                            "mimeType": mime or f"{get_media_type(ext)}/*",
                            "modifiedAt": datetime.fromtimestamp(stat.st_mtime).isoformat()
                        })
                    except Exception:
                        continue
    except Exception:
        pass

    return files_batch, list(folders_batch), current_rel

def scan_directory_multiprocess(raw_target_path):
    target_path = resolve_target_path(raw_target_path)
    if not os.path.exists(target_path):
        return {
            "error": f"Path does not exist: {raw_target_path} (Resolved: {target_path})",
            "files": [],
            "folders": []
        }

    redis_client = RedisClient()

    # Collect subfolders for multiprocessing execution
    subfolders_to_scan = [target_path]
    for root, dirs, _ in os.walk(target_path):
        for d in dirs:
            full_d = os.path.join(root, d)
            subfolders_to_scan.append(full_d)

    all_files = []
    all_folders_set = set()
    last_emit_count = 0

    # Determine CPU core worker count
    max_workers = min(os.cpu_count() or 4, 16)

    # Process subfolders in parallel using ProcessPoolExecutor
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(scan_single_subfolder, (sub_dir, target_path))
            for sub_dir in subfolders_to_scan
        ]

        for future in as_completed(futures):
            try:
                files_batch, folders_batch, current_rel = future.result()
                all_files.extend(files_batch)
                all_folders_set.update(folders_batch)

                if len(all_files) - last_emit_count >= 15 or len(all_files) == 1:
                    latest_name = files_batch[-1]["name"] if files_batch else ""
                    emit_progress(len(all_files), len(all_folders_set), current_rel, latest_name, redis_client)
                    last_emit_count = len(all_files)
            except Exception:
                continue

    # Final progress emission
    final_latest = all_files[-1]["name"] if all_files else ""
    emit_progress(len(all_files), len(all_folders_set), "Completed", final_latest, redis_client)

    scan_result = {
        "targetPath": raw_target_path,
        "resolvedPath": target_path,
        "totalFiles": len(all_files),
        "folders": sorted(list(all_folders_set)),
        "files": all_files
    }

    # Store scan result in Redis cache
    redis_client.set("media_scan_result", json.dumps(scan_result), ex=3600)

    return scan_result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No directory path provided."}))
        sys.exit(1)

    folder_arg = sys.argv[1]
    result = scan_directory_multiprocess(folder_arg)
    print(json.dumps(result))
