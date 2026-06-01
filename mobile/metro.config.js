const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    // Tell Metro to treat .tflite files as bundleable assets.
    assetExts: [...defaultConfig.resolver.assetExts, 'tflite'],
    // Skip native build artifacts. Android's Gradle/CMake build creates and
    // deletes temp files in these paths, which crashes Metro's file watcher on
    // Windows (where Watchman isn't installed by default).
    blockList: [
      /[\\/]\.cxx[\\/]/,
      /[\\/]android[\\/]build[\\/]/,
      /[\\/]android[\\/]app[\\/]build[\\/]/,
      /[\\/]android[\\/].*[\\/]build[\\/]/,
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
