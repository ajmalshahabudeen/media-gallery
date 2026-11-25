@echo off
setlocal enabledelayedexpansion

:: Disable BuildKit provenance attestations to avoid containerd/unpigz layer export errors
set "BUILDX_NO_DEFAULT_ATTESTATIONS=1"

echo ==========================================
echo  Starting Media Gallery App via Docker...
echo  Port: 38479
echo ==========================================
echo.

:: 1. Check if Docker CLI is installed
echo [1/4] Checking Docker installation...
where docker >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Docker is not installed or not added to system PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)
docker compose version >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Docker Compose plugin is not available.
    pause
    exit /b 1
)
echo   + Docker CLI ^& Compose found.

:: 2. Check if Docker Daemon is running
echo [2/4] Checking Docker daemon status...
docker info >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Docker daemon is not running.
    echo Please start Docker Desktop and ensure the engine is running, then try again.
    pause
    exit /b 1
)
echo   + Docker daemon is running.

:: 3. Check existing container status
echo [3/4] Checking container status...
docker ps --format "{{.Names}}" | findstr /C:"media_gallery_app" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo   + Container 'media_gallery_app' is already running. Rebuilding if code changed...
) else (
    echo   + Container is not running. Preparing build and startup...
)

:: 4. Build and start containers
echo [4/4] Building ^& launching containers...
docker compose down --remove-orphans >nul 2>&1
docker compose up -d --build
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo [WARNING] Normal build/startup failed. Resetting build cache ^& base image layers...
    docker compose down --remove-orphans >nul 2>&1
    docker rmi -f media-gallery-web:latest >nul 2>&1
    docker rmi -f oven/bun:1.3.14-alpine >nul 2>&1
    docker builder prune -a -f
    docker image prune -f >nul 2>&1

    echo   + Rebuilding image cleanly from fresh base image...
    docker compose build --no-cache --pull
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Docker image build failed after cache reset.
        pause
        exit /b 1
    )

    echo   + Starting containers...
    docker compose up -d --force-recreate
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to start Docker containers after rebuild.
        echo.
        echo Container logs:
        docker compose logs --tail=30
        pause
        exit /b 1
    )
)

:: 5. Health verification (wait up to ~30s for container to become healthy/running)
echo Verifying container startup...
set "APP_READY=0"
for /L %%i in (1,1,15) do (
    for /f "delims=" %%r in ('docker inspect --format "{{.State.Running}}" media_gallery_app 2^>nul') do set "IS_RUNNING=%%r"
    if /i "!IS_RUNNING!"=="false" (
        echo [ERROR] Container 'media_gallery_app' exited unexpectedly.
        docker compose logs --tail=30
        pause
        exit /b 1
    )
    for /f "delims=" %%h in ('docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}healthy{{end}}" media_gallery_app 2^>nul') do set "HEALTH_STATUS=%%h"
    if /i "!HEALTH_STATUS!"=="healthy" (
        set "APP_READY=1"
        goto :verified
    )
    ping -n 3 127.0.0.1 >nul 2>&1
)

:verified
if "!APP_READY!"=="0" (
    echo [WARNING] Container is running but still warming up ^(health: !HEALTH_STATUS!^).
)

echo.
echo ==========================================
echo  Media Gallery successfully launched!
echo  Opening browser at http://localhost:38479
echo ==========================================
echo.

start http://localhost:38479
