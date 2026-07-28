#!/usr/bin/env bash
set -e

echo "=========================================="
echo " Starting Android APK Build in Container"
echo "=========================================="

cd /app

echo "[1/4] Installing dependencies via Bun..."
bun install

echo "[2/4] Generating native Android project (Expo Prebuild)..."
bun x expo prebuild --platform android --clean

# Ensure Gradle wrapper version is valid
WRAPPER_PROP="android/gradle/wrapper/gradle-wrapper.properties"
if [ -f "$WRAPPER_PROP" ]; then
  if grep -q "gradle-9.3.1-bin.zip" "$WRAPPER_PROP"; then
    echo "Fixing Gradle wrapper distribution URL..."
    sed -i 's/gradle-9.3.1-bin.zip/gradle-8.10.2-bin.zip/g' "$WRAPPER_PROP"
  fi
fi

echo "[3/4] Building Release APK via Gradle..."
cd android
chmod +x gradlew
./gradlew assembleRelease
cd ..

APK_SRC="android/app/build/outputs/apk/release/app-release.apk"
APK_DEST="build/app-release.apk"

if [ -f "$APK_SRC" ]; then
  mkdir -p build
  cp "$APK_SRC" "$APK_DEST"
  echo "=========================================="
  echo " SUCCESS: APK built and exported!"
  echo " Output APK: /app/$APK_SRC"
  echo " Local Copy: /app/$APK_DEST"
  echo "=========================================="
else
  echo "ERROR: APK compilation output not found at $APK_SRC"
  exit 1
fi
