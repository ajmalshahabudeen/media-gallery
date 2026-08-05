const { withGradleProperties } = require("@expo/config-plugins");

/**
 * Expo Config Plugin to enforce production-safe Android build properties
 * both locally and on EAS Cloud build servers (eas build).
 */
module.exports = function withCustomGradleProps(config) {
  return withGradleProperties(config, (config) => {
    // Strip default or opposing entries if present
    config.modResults = config.modResults.filter(
      (item) =>
        item.key !== "newArchEnabled" &&
        item.key !== "expo.useLegacyPackaging" &&
        item.key !== "android.targetSdkVersion"
    );

    // 1. Force New Architecture OFF (enables legacy Expo module compatibility like expo-av)
    config.modResults.push({
      type: "property",
      key: "newArchEnabled",
      value: "false",
    });

    // 2. Force uncompressed, page-aligned JNI libraries for Android 11+ (Samsung A52 & LG G8x)
    config.modResults.push({
      type: "property",
      key: "expo.useLegacyPackaging",
      value: "false",
    });

    // 3. Force targetSdkVersion 34 (Android 14 standard runtime)
    config.modResults.push({
      type: "property",
      key: "android.targetSdkVersion",
      value: "34",
    });

    return config;
  });
};
