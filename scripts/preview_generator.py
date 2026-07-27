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
from pathlib import Path

# Try importing Pillow for pure Python image processing
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.heic', '.avif'}
VIDEO_EXTENSIONS = {'.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.m4v'}

class RedisClient:
    """Lightweight Python Redis client using standard TCP socket (RESP protocol)."""
    def __init__(self, host='127.0.0.1', port=6379, timeout=3.0):
        self.host = os.environ.get('REDIS_HOST', host)
        self.port = int(os.environ.get('REDIS_PORT', port))
        self.timeout = timeout

    def _connect(self):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            sock.connect((self.host, self.port))
            return sock
        except Exception:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(self.timeout)
                sock.connect(('127.0.0.1', 6379))
                return sock
            except Exception:
                return None

    def get_bytes(self, key):
        """GET key returning raw bytes"""
        sock = self._connect()
        if not sock:
            return None
        try:
            key_bytes = key.encode('utf-8')
            cmd = f"*2\r\n$3\r\nGET\r\n${len(key_bytes)}\r\n".encode('utf-8') + key_bytes + b"\r\n"
            sock.sendall(cmd)
            
            # Simple RESP parser for Bulk String ($length\r\ndata\r\n)
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
            key_bytes = key.encode('utf-8')
            cmd = f"*2\r\n$6\r\nEXISTS\r\n${len(key_bytes)}\r\n".encode('utf-8') + key_bytes + b"\r\n"
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
            key_bytes = key.encode('utf-8')
            ex_bytes = str(ex).encode('utf-8')
            cmd = (
                f"*4\r\n$3\r\nSET\r\n${len(key_bytes)}\r\n".encode('utf-8') + key_bytes +
                f"\r\n${len(value_bytes)}\r\n".encode('utf-8') + value_bytes +
                f"\r\n$2\r\nEX\r\n${len(ex_bytes)}\r\n".encode('utf-8') + ex_bytes + b"\r\n"
            )
            sock.sendall(cmd)
            resp = sock.recv(128)
            sock.close()
            return b"+OK" in resp
        except Exception:
            return False

    def rpop(self, key):
        """RPOP key"""
        sock = self._connect()
        if not sock:
            return None
        try:
            key_bytes = key.encode('utf-8')
            cmd = f"*2\r\n$4\r\nRPOP\r\n${len(key_bytes)}\r\n".encode('utf-8') + key_bytes + b"\r\n"
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

def get_hash(file_path):
    return hashlib.md5(file_path.encode('utf-8')).hexdigest()

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

def process_file_task(file_path, redis_client):
    """Process single task: generate & cache thumbnail and hover play preview."""
    ext = os.path.splitext(file_path)[1].lower()
    path_hash = get_hash(file_path)
    
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

    # 2. Process Hover Sneak Peek if video and not already cached
    if ext in VIDEO_EXTENSIONS and not redis_client.exists(hover_key):
        hover_bytes = generate_video_hover_preview(file_path)
        if hover_bytes:
            redis_client.set_bytes(hover_key, hover_bytes, ex=2592000)

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
                    if file_path and os.path.exists(file_path):
                        process_file_task(file_path, redis_client)
                except Exception:
                    pass
                # Slight throttling sleep to keep CPU cool
                time.sleep(0.05)
            else:
                idle_count += 1
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
