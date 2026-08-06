#!/usr/bin/env python3
import os
import sys
import json
import time
import socket
import hashlib
import shutil
import subprocess
import io
import gc
from pathlib import Path

# Try importing Pillow for pure Python image processing
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.heic', '.avif'}
VIDEO_EXTENSIONS = {'.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.m4v'}

def encode_resp_command(*args):
    """Encode arguments into a standard Redis RESP command array."""
    parts = [f"*{len(args)}\r\n".encode('utf-8')]
    for arg in args:
        if isinstance(arg, str):
            arg_bytes = arg.encode('utf-8')
        elif isinstance(arg, int):
            arg_bytes = str(arg).encode('utf-8')
        elif isinstance(arg, bytes):
            arg_bytes = arg
        else:
            arg_bytes = str(arg).encode('utf-8')
        parts.append(f"${len(arg_bytes)}\r\n".encode('utf-8') + arg_bytes + b"\r\n")
    return b"".join(parts)

class RedisClient:
    """Lightweight Python Redis client using standard TCP socket (RESP protocol)."""
    def __init__(self, host='127.0.0.1', port=6379, timeout=3.0):
        redis_url = os.environ.get('REDIS_URL', '')
        if 'redis://' in redis_url:
            try:
                parts = redis_url.replace('redis://', '').split('/')[0].split(':')
                if parts[0]:
                    host = parts[0]
                if len(parts) > 1 and parts[1].isdigit():
                    port = int(parts[1])
            except Exception:
                pass
        self.host = os.environ.get('REDIS_HOST', host)
        self.port = int(os.environ.get('REDIS_PORT', port))
        self.timeout = timeout

    def _connect(self):
        hosts_to_try = [self.host]
        for candidate in ['redis', '127.0.0.1', 'localhost', 'host.docker.internal']:
            if candidate not in hosts_to_try:
                hosts_to_try.append(candidate)

        for h in hosts_to_try:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(self.timeout)
                sock.connect((h, self.port))
                return sock
            except Exception:
                continue
        return None

    def get_bytes(self, key):
        """GET key returning raw bytes"""
        sock = self._connect()
        if not sock:
            return None
        try:
            cmd = encode_resp_command("GET", key)
            sock.sendall(cmd)
            
            header = b""
            while b"\r\n" not in header:
                chunk = sock.recv(128)
                if not chunk:
                    break
                header += chunk
            
            if not header.startswith(b"$"):
                sock.close()
                return None
            
            lines = header.split(b"\r\n", 1)
            length = int(lines[0][1:])
            if length == -1:
                sock.close()
                return None
            
            payload = lines[1]
            while len(payload) < length + 2:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                payload += chunk
            
            sock.close()
            return payload[:length]
        except Exception:
            return None

    def exists(self, key):
        """EXISTS key"""
        sock = self._connect()
        if not sock:
            return False
        try:
            cmd = encode_resp_command("EXISTS", key)
            sock.sendall(cmd)
            resp = sock.recv(128)
            sock.close()
            return b":1" in resp
        except Exception:
            return False

    def set_bytes(self, key, value_bytes, ex=2592000):
        """SET key value EX ex"""
        sock = self._connect()
        if not sock:
            return False
        try:
            cmd = encode_resp_command("SET", key, value_bytes, "EX", ex)
            sock.sendall(cmd)
            resp = sock.recv(128)
            sock.close()
            return b"+OK" in resp
        except Exception:
            return False

    def set(self, key, value, ex=3600):
        """SET key string EX ex"""
        sock = self._connect()
        if not sock:
            return False
        try:
            cmd = encode_resp_command("SET", key, str(value), "EX", ex)
            sock.sendall(cmd)
            resp = sock.recv(128)
            sock.close()
            return b"+OK" in resp
        except Exception:
            return False

    def incr(self, key):
        """INCR key"""
        sock = self._connect()
        if not sock:
            return 0
        try:
            cmd = encode_resp_command("INCR", key)
            sock.sendall(cmd)
            resp = sock.recv(128)
            sock.close()
            if resp.startswith(b":"):
                return int(resp.strip().split(b"\r\n")[0][1:])
            return 0
        except Exception:
            return 0

    def rpop(self, key):
        """RPOP key"""
        sock = self._connect()
        if not sock:
            return None
        try:
            cmd = encode_resp_command("RPOP", key)
            sock.sendall(cmd)
            
            header = b""
            while b"\r\n" not in header:
                chunk = sock.recv(128)
                if not chunk:
                    break
                header += chunk
            
            if not header.startswith(b"$"):
                sock.close()
                return None
            
            lines = header.split(b"\r\n", 1)
            length = int(lines[0][1:])
            if length == -1:
                sock.close()
                return None
            
            payload = lines[1]
            while len(payload) < length + 2:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                payload += chunk
            
            sock.close()
            return payload[:length].decode('utf-8', errors='ignore')
        except Exception:
            return None

import re

def resolve_target_path(target_path):
    if not target_path:
        return target_path

    norm_path = target_path.replace('\\', '/').strip()
    if os.path.exists(norm_path):
        return norm_path

    drive_match = re.match(r'^([a-zA-Z]):[/\\]?(.*)', norm_path)
    if drive_match:
        dl_lower = drive_match.group(1).lower()
        dl_upper = drive_match.group(1).upper()
        subpath = drive_match.group(2).strip('/')

        candidates = []
        for dl in (dl_lower, dl_upper):
            bases = [
                f"/host_drives/{dl}",
                f"/run/desktop/mnt/host/{dl}",
                f"/mnt/{dl}",
                f"/host_media/{dl}",
            ]
            for base in bases:
                candidates.append(os.path.join(base, subpath) if subpath else base)

        if subpath:
            candidates.append(os.path.join("/host_media", subpath))

        for candidate in candidates:
            if candidate and os.path.exists(candidate):
                return candidate

    return norm_path

def normalize_file_path(path_str):
    """Normalize Windows/Linux paths to a unified forward-slash representation for consistent MD5 hashing."""
    if not path_str:
        return ""
    normalized = path_str.replace('\\', '/').strip()
    if normalized.startswith('/host_drives/'):
        parts = normalized.split('/host_drives/', 1)[1]
        if parts:
            drive_letter = parts[0].lower()
            sub = parts[1:].lstrip('/')
            return f"{drive_letter}:/{sub}".lower()
    drive_match = re.match(r'^([a-zA-Z]):/(.*)', normalized)
    if drive_match:
        return f"{drive_match.group(1).lower()}:/{drive_match.group(2)}".lower()
    return normalized.lower()

def get_hash(file_path):
    norm_path = normalize_file_path(file_path)
    return hashlib.md5(norm_path.encode('utf-8')).hexdigest()

def generate_image_thumbnail(file_path):
    """Generate resized WebP thumbnail for images."""
    if not HAS_PIL or not os.path.exists(file_path):
        return None
    try:
        with Image.open(file_path) as img:
            img.thumbnail((480, 360))
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")
            
            bio = io.BytesIO()
            img.save(bio, format="WEBP", quality=75)
            return bio.getvalue()
    except Exception:
        return None

def generate_video_thumbnail(file_path):
    """Extract poster frame at 10% or 2s mark using ffmpeg."""
    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin or not os.path.exists(file_path):
        return None
    try:
        cmd = [
            ffmpeg_bin,
            "-ss", "00:00:02",
            "-i", file_path,
            "-vframes", "1",
            "-vf", "scale=480:-1:flags=lanczos",
            "-f", "image2",
            "-c:v", "libwebp",
            "-q:v", "75",
            "-y",
            "pipe:1"
        ]
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        out, _ = proc.communicate(timeout=10)
        if proc.returncode == 0 and len(out) > 100:
            return out
        
        # Fallback to start of video (00:00:00)
        cmd[2] = "00:00:00"
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        out, _ = proc.communicate(timeout=10)
        if proc.returncode == 0 and len(out) > 100:
            return out
    except Exception:
        pass
    return None

def generate_video_hover_preview(file_path):
    """Generate 2-second 8fps animated WebP clip for PC hover sneak peek using ffmpeg."""
    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin or not os.path.exists(file_path):
        return None
    try:
        cmd = [
            ffmpeg_bin,
            "-ss", "00:00:01",
            "-t", "2",
            "-i", file_path,
            "-vf", "fps=8,scale=320:-1:flags=lanczos",
            "-f", "webp",
            "-c:v", "libwebp",
            "-lossless", "0",
            "-q:v", "55",
            "-loop", "0",
            "-an",
            "-y",
            "pipe:1"
        ]
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        out, _ = proc.communicate(timeout=15)
        if proc.returncode == 0 and len(out) > 100:
            return out
    except Exception:
        pass
    return None

def process_file_task(raw_file_path, redis_client):
    """Process single task: generate & cache thumbnail and hover play preview."""
    try:
        file_path = resolve_target_path(raw_file_path)
        if not file_path or not os.path.exists(file_path):
            sys.stderr.write(f"[PreviewGenerator] Skip missing file: {raw_file_path}\n")
            sys.stderr.flush()
            return

        ext = os.path.splitext(file_path)[1].lower()
        path_hash = get_hash(raw_file_path)
        
        thumb_key = f"thumb:{path_hash}"
        hover_key = f"hover:{path_hash}"
        
        # 1. Process Thumbnail if not already cached
        if not redis_client.exists(thumb_key):
            thumb_bytes = None
            if ext in IMAGE_EXTENSIONS:
                thumb_bytes = generate_image_thumbnail(file_path)
            elif ext in VIDEO_EXTENSIONS:
                thumb_bytes = generate_video_thumbnail(file_path)
                
            if thumb_bytes:
                redis_client.set_bytes(thumb_key, thumb_bytes, ex=2592000)
                sys.stderr.write(f"[PreviewGenerator] Generated thumbnail for: {os.path.basename(file_path)}\n")
                sys.stderr.flush()

        # 2. Process Hover Sneak Peek if video and not already cached
        if ext in VIDEO_EXTENSIONS and not redis_client.exists(hover_key):
            hover_bytes = generate_video_hover_preview(file_path)
            if hover_bytes:
                redis_client.set_bytes(hover_key, hover_bytes, ex=2592000)
                sys.stderr.write(f"[PreviewGenerator] Generated hover preview for: {os.path.basename(file_path)}\n")
                sys.stderr.flush()
    finally:
        redis_client.incr("preview_completed_count")

def worker_loop(daemon=True):
    """Silent background worker loop popping from media_preview_tasks."""
    # Lower process priority so background generation doesn't affect main web server
    try:
        os.nice(10)
    except Exception:
        pass

    redis_client = RedisClient()
    sys.stderr.write("[PreviewGenerator] Worker loop started in background...\n")
    sys.stderr.flush()

    idle_count = 0
    while True:
        try:
            task_json = redis_client.rpop("media_preview_tasks")
            if task_json:
                idle_count = 0
                try:
                    task = json.loads(task_json)
                    file_path = task.get("path")
                    if file_path:
                        process_file_task(file_path, redis_client)
                except Exception:
                    pass
                # Slight throttling sleep to keep CPU cool
                time.sleep(0.05)
            else:
                idle_count += 1
                if idle_count % 5 == 0:
                    gc.collect()
                if not daemon and idle_count > 10:
                    break
                # Sleep when queue is empty
                time.sleep(2.0)
        except Exception:
            time.sleep(3.0)

if __name__ == "__main__":
    is_daemon = "--daemon" in sys.argv or "-d" in sys.argv
    if "--single" in sys.argv:
        idx = sys.argv.index("--single")
        if idx + 1 < len(sys.argv):
            target = sys.argv[idx + 1]
            cli_redis = RedisClient()
            process_file_task(target, cli_redis)
            print(f"Processed single file: {target}")
            sys.exit(0)

    worker_loop(daemon=is_daemon)
