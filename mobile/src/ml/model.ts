// Real model loading goes here. With react-native-fast-tflite the typical usage is:
//
//   import { useTensorflowModel } from 'react-native-fast-tflite';
//   export const usePotholeModel = () =>
//     useTensorflowModel(require('../../assets/pothole.tflite'));
//
// Then in a vision-camera frame processor:
//   const model = usePotholeModel();
//   if (model.state === 'loaded') {
//     const out = model.model.runSync([resizedFrame]);
//     // ... decode (see detector.ts)
//   }
//
// Deferred until vision-camera-resize-plugin (or a Nitro-based successor) supports
// vision-camera v5+. The trained pothole.tflite is in mobile/assets/, ready to wire
// when the ecosystem catches up.
export {};
