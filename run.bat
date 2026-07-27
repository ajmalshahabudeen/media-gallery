@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo  Starting Media Gallery App via Docker...
echo  Port: 38479
echo ==========================================
echo.

:: 1. Check if Docker CLI is installed
echo [1/4] Checking Docker installation...
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed or not added to system PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)
echo   + Docker CLI found.

:: 2. Check if Docker Daemon is running
echo [2/4] Checking Docker daemon status...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker daemon is not running.
    echo Please start Docker Desktop and ensure the engine is running, then try again.
    pause
    exit /b 1
)
echo   + Docker daemon is running.

:: 3. Check existing container status
echo [3/4] Checking container status ^& code changes...
docker ps --format "{{.Names}}" | findstr /C:"media_gallery_app" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   + Container 'media_gallery_app' is already running. Checking for code changes...
) else (
    echo   + Container is not running. Preparing build and startup...
)

:: 4. Build and start containers with auto-rebuild on code changes
echo [4/4] Building ^& launching containers...
docker compose down --remove-orphans >nul 2>&1
docker compose up -d --build
if !ERRORLEVEL! NEQ 0 (
    echo [WARNING] Normal build failed. Clearing corrupted build cache and retrying...
    docker builder prune -f
    docker compose build --no-cache
    docker compose up -d
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to start Docker containers after cache reset.
        echo.
        echo Container logs:
        docker compose logs --tail=20
        pause
        exit /b !ERRORLEVEL!
    )
)

:: 5. Health verification
ping -n 3 127.0.0.1 >nul 2>&1
docker ps --format "{{.Names}}" | findstr /C:"media_gallery_app" >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [WARNING] App container may have exited unexpectedly.
    echo Container logs:
    docker compose logs --tail=20
    pause
    exit /b 1
)

echo.
echo ==========================================
echo  Media Gallery successfully launched!
echo  Opening browser at http://localhost:38479
echo ==========================================
echo.

start http://localhost:38479
