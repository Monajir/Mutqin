const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The Hifz backend lives beside the Expo app. Its generated Python folders
// are not JavaScript inputs and may contain files Metro cannot read on Windows.
config.resolver.blockList = [
  /mutqin-ai-service[\\/]\.pytest_cache[\\/].*/,
  /mutqin-ai-service[\\/].*[\\/]__pycache__[\\/].*/,
  /mutqin-ai-service[\\/]\.venv[\\/].*/,
];

module.exports = config;
