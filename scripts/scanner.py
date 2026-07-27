#!/usr/bin/env python3
import os
import sys
import json
import re
import mimetypes
from pathlib import Path
from datetime import datetime

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.heic', '.avif'}
VIDEO_EXTENSIONS = {'.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.m4v'}
AUDIO_EXTENSIONS = {'.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'}
MEDIA_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS | AUDIO_EXTENSIONS

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
    # 1. Direct path check
    if os.path.exists(target_path):
        return target_path

    # Normalize backslashes
    norm_path = target_path.replace('\\', '/')

    # 2. Check drive letter mapping for Windows paths inside Docker/Linux
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

    # 3. Fallback: check if /host_media exists inside Docker
    if os.path.exists("/host_media"):
        return "/host_media"

    return target_path

def emit_progress(scanned_files, scanned_folders, current_folder, latest_file):
    progress_data = {
        "scannedFiles": scanned_files,
        "scannedFolders": scanned_folders,
        "currentFolder": current_folder,
        "latestFile": latest_file
    }
    sys.stderr.write(f"PROGRESS:{json.dumps(progress_data)}\n")
    sys.stderr.flush()

def scan_directory(raw_target_path):
    target_path = resolve_target_path(raw_target_path)
    if not os.path.exists(target_path):
        return {
            "error": f"Path does not exist: {raw_target_path} (Resolved: {target_path})",
            "files": [],
            "folders": []
        }

    files_list = []
    folders_set = set()
    last_emit_count = 0

    for root, dirs, filenames in os.walk(target_path):
        rel_folder = os.path.relpath(root, target_path)
        if rel_folder != ".":
            folders_set.add(rel_folder)

        current_rel = rel_folder if rel_folder != "." else "/"

        for fname in filenames:
            ext = os.path.splitext(fname)[1].lower()
            if ext in MEDIA_EXTENSIONS:
                full_path = os.path.join(root, fname)
                try:
                    stat = os.stat(full_path)
                    mime, _ = mimetypes.guess_type(full_path)
                    files_list.append({
                        "id": f"{full_path}_{stat.st_mtime}",
                        "name": fname,
                        "path": full_path,
                        "folder": current_rel,
                        "size": stat.st_size,
                        "extension": ext,
                        "type": get_media_type(ext),
                        "mimeType": mime or f"{get_media_type(ext)}/*",
                        "modifiedAt": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })

                    # Emit progress periodically or on new files
                    if len(files_list) - last_emit_count >= 10 or len(files_list) == 1:
                        emit_progress(len(files_list), len(folders_set), current_rel, fname)
                        last_emit_count = len(files_list)
                except Exception:
                    continue

    # Emit final progress count
    emit_progress(len(files_list), len(folders_set), "Completed", files_list[-1]["name"] if files_list else "")

    return {
        "targetPath": raw_target_path,
        "resolvedPath": target_path,
        "totalFiles": len(files_list),
        "folders": sorted(list(folders_set)),
        "files": files_list
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No directory path provided."}))
        sys.exit(1)

    folder_arg = sys.argv[1]
    result = scan_directory(folder_arg)
    print(json.dumps(result))
