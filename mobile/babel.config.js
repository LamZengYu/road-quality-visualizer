module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Worklets plugin is disabled. Phase 3e (real on-device ML) is deferred until
  // vision-camera-resize-plugin (or a successor) ships v5-compatible support.
  // Re-enable when wiring frame-processor-based inference:
  //   plugins: [['react-native-worklets-core/plugin']],
};
