const fs = require('fs');
const path = require('path');

const gradlePropsPath = path.join(__dirname, '..', 'android', 'gradle.properties');

if (fs.existsSync(gradlePropsPath)) {
  let content = fs.readFileSync(gradlePropsPath, 'utf8');

  // Ensure New Architecture is enabled for Reanimated 4 and React Native 0.86
  content = content.replace(/newArchEnabled=false/g, 'newArchEnabled=true');

  // Ensure NDK 26.3 path is present if NDK is installed
  const ndkPath = 'C:\\Users\\anees\\AppData\\Local\\Android\\Sdk\\ndk\\26.3.11579264';
  if (fs.existsSync(ndkPath) && !content.includes('android.ndkPath')) {
    content += `\n# Use official NDK 26.3 for React Native 0.86 / Expo 57\nandroid.ndkPath=${ndkPath.replace(/\\/g, '\\\\')}\n`;
  }

  fs.writeFileSync(gradlePropsPath, content, 'utf8');
  console.log('✓ Successfully patched android/gradle.properties (newArchEnabled=true, NDK 26.3)');
} else {
  console.warn('⚠️ android/gradle.properties not found');
}
