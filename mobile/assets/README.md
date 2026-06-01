# mobile/assets/

Where to drop the trained model when wiring up real on-device inference:

- `pothole.tflite` — the trained pothole detector (from `ml/models/exported/`)

Once it's here AND `vision-camera-resize-plugin` is installed AND the babel
worklets plugin is active (already configured in `babel.config.js`), edit
`src/ml/model.ts` and `src/ml/detector.ts` to enable real inference.

See the "wire real on-device YOLO" comment block at the top of
`src/ml/detector.ts` for the full integration recipe.
