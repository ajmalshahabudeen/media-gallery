const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  ...(config.resolver.nodeModulesPaths || []),
];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "expo-local-authentication": path.resolve(
    __dirname,
    "node_modules/expo-local-authentication"
  ),
};

module.exports = config;
