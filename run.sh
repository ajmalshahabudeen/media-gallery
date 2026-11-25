#!/usr/bin/env bash
set -u

# Disable Compose Bake & BuildKit attestations so Docker uses the local engine cleanly
export COMPOSE_BAKE=false
export BUILDX_NO_DEFAULT_ATTESTATIONS=1

echo "=========================================="
echo " Starting Media Gallery App via Docker..."
echo " Port: 38479"
echo "=========================================="
echo ""

# 1. Check if Docker CLI is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH."
    echo "Please install Docker from https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# 2. Detect Docker Compose command
if docker compose version &> /dev/null; then
    COMPOSE_CMD=(docker compose)
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD=(docker-compose)
else
    echo "Error: Docker Compose is not installed."
    exit 1
fi

# 3. Check if Docker Daemon is running
echo "[1/4] Checking Docker Daemon status..."
if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running."
    echo "Please start Docker Desktop or the Docker service, then try again."
    exit 1
fi
echo "  + Docker daemon is active."

# 4. Check existing container status
echo "[2/4] Checking container status..."
if docker ps --format '{{.Names}}' | grep -q "^media_gallery_app$"; then
    echo "  + Container 'media_gallery_app' is currently running."
else
    echo "  + Container is not running. Preparing to build/launch..."
fi

# 5. Build and launch containers
echo "[3/4] Building images & launching containers..."
"${COMPOSE_CMD[@]}" down --remove-orphans &> /dev/null || true
if ! ("${COMPOSE_CMD[@]}" build && "${COMPOSE_CMD[@]}" up -d); then
    echo "Warning: Normal build/startup failed. Resetting build cache & base image layers..."
    "${COMPOSE_CMD[@]}" down --remove-orphans &> /dev/null || true
    docker rmi -f media-gallery-web:latest &> /dev/null || true
    docker rmi -f oven/bun:1.3.14-alpine &> /dev/null || true
    docker builder prune -a -f
    docker image prune -f &> /dev/null || true

    echo "  + Rebuilding image cleanly from fresh base image..."
    if ! "${COMPOSE_CMD[@]}" build --no-cache --pull; then
        echo "Error: Docker image build failed after cache reset."
        exit 1
    fi

    echo "  + Starting containers..."
    if ! "${COMPOSE_CMD[@]}" up -d --force-recreate; then
        echo "Error: Failed to start Docker containers after rebuild."
        "${COMPOSE_CMD[@]}" logs --tail=30
        exit 1
    fi
fi

# 6. Verify container health & running status
echo "[4/4] Verifying container startup..."
APP_READY=0
for _ in $(seq 1 15); do
    IS_RUNNING=$(docker inspect --format '{{.State.Running}}' media_gallery_app 2>/dev/null || echo "false")
    if [ "$IS_RUNNING" != "true" ]; then
        echo "Error: App container exited unexpectedly."
        "${COMPOSE_CMD[@]}" logs --tail=30
        exit 1
    fi
    HEALTH_STATUS=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}healthy{{end}}' media_gallery_app 2>/dev/null || echo "starting")
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        APP_READY=1
        break
    fi
    sleep 2
done

if [ "$APP_READY" -eq 1 ]; then
    echo "  + App container is running and healthy!"
else
    echo "  + App container is running (still warming up: $HEALTH_STATUS)."
fi

echo ""
echo "=========================================="
echo " Media Gallery successfully launched!"
echo " Opening http://localhost:38479 ..."
echo "=========================================="

PORT_URL="http://localhost:38479"

if command -v xdg-open &> /dev/null; then
    xdg-open "$PORT_URL" &> /dev/null &
elif command -v open &> /dev/null; then
    open "$PORT_URL" &> /dev/null &
elif command -v cmd.exe &> /dev/null; then
    cmd.exe /c start "$PORT_URL" &> /dev/null
else
    echo "Please open your browser and navigate to: $PORT_URL"
fi
