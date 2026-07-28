#!/usr/bin/env bash
set -e

echo "=========================================="
echo " Starting Docker-Based Android APK Build"
echo "=========================================="

# Navigate to mobile root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

MOBILE_DIR="$PWD"

# Check Docker CLI installation
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker CLI is not installed or not in PATH."
  echo "Please install Docker Desktop and try again."
  exit 1
fi

# Check Docker daemon status
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running."
  echo "Please start Docker Desktop and try again."
  exit 1
fi

# Resolve host directory path for Windows/Linux compatibility
if command -v cygpath >/dev/null 2>&1; then
  HOST_MOUNT_DIR="$(cygpath -w "$MOBILE_DIR")"
elif command -v pwd >/dev/null 2>&1 && pwd -W >/dev/null 2>&1; then
  HOST_MOUNT_DIR="$(pwd -W)"
else
  HOST_MOUNT_DIR="$MOBILE_DIR"
fi

IMAGE_NAME="mobile-android-builder:latest"

# Build Docker builder image if it doesn't exist or if requested
if [[ "$1" == "--rebuild" ]] || ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
  echo "[1/2] Building Android Builder Docker Image ($IMAGE_NAME)..."
  docker build -t "$IMAGE_NAME" -f Dockerfile.android .
else
  echo "[1/2] Android Builder Docker Image ($IMAGE_NAME) already exists."
fi

echo "[2/2] Running build inside Docker container (auto-removed after build)..."

# Disable path conversion on Git Bash / MSYS
export MSYS_NO_PATHCONV=1

docker run --rm \
  -v "$HOST_MOUNT_DIR:/app" \
  "$IMAGE_NAME" \
  bash /app/scripts/container-build-apk.sh

APK_PATH="build/app-release.apk"
ALT_APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ] || [ -f "$ALT_APK_PATH" ]; then
  echo "=========================================="
  echo " SUCCESS: Android APK built and exported!"
  echo " Container removed automatically (--rm)."
  echo " Local APK Location: $MOBILE_DIR/$APK_PATH"
  echo " Install via ADB:    adb install $APK_PATH"
  echo "=========================================="
else
  echo "ERROR: Exported APK not found in local directory."
  exit 1
fi
