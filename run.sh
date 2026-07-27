#!/usr/bin/env bash

# 1-Click Launch Script for Media Gallery Docker App
echo "=========================================="
echo " Starting Media Gallery App via Docker..."
echo " Port: 38479"
echo "=========================================="
echo ""

# 1. Check if Docker CLI is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH."
    echo "   Please install Docker from https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# 2. Check if Docker Compose plugin is available
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed."
    echo "   Please install Docker Compose plugin."
    exit 1
fi

# 3. Check if Docker Daemon is running
echo "[1/4] Checking Docker Daemon status..."
if ! docker info &> /dev/null; then
    echo "❌ Error: Docker daemon is not running."
    echo "   Please start Docker Desktop or the Docker service, then try again."
    exit 1
fi
echo "  ✓ Docker daemon is active."

# 4. Check existing container status
echo "[2/4] Checking container status..."
if docker ps --format '{{.Names}}' | grep -q "media_gallery_app"; then
    echo "  ℹ️ Container 'media_gallery_app' is currently running."
else
    echo "  ℹ️ Container is not running. Preparing to build/launch..."
fi

# 5. Build and launch containers with code change detection
echo "[3/4] Building images & launching containers..."
docker compose up -d --build

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to build or start Docker containers."
    echo "Showing recent container logs:"
    docker compose logs --tail=20
    exit 1
fi

# 6. Verify container health & running status
echo "[4/4] Verifying container startup..."
sleep 2
if docker ps --format '{{.Names}}' | grep -q "media_gallery_app"; then
    echo "  ✓ App container is running!"
else
    echo "⚠️ Warning: App container may have exited immediately."
    echo "Showing container logs:"
    docker compose logs --tail=20
    exit 1
fi

echo ""
echo "=========================================="
echo " 🎉 Media Gallery successfully launched!"
echo " Opening http://localhost:38479 ..."
echo "=========================================="

# 7. Open browser based on OS environment
PORT_URL="http://localhost:38479"

if command -v xdg-open &> /dev/null; then
    xdg-open "$PORT_URL" &> /dev/null
elif command -v open &> /dev/null; then
    open "$PORT_URL" &> /dev/null
elif command -v cmd.exe &> /dev/null; then
    cmd.exe /c start "$PORT_URL" &> /dev/null
else
    echo "Please open your browser and navigate to: $PORT_URL"
fi
