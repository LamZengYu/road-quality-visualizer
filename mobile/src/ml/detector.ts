// Detector interface + a MOCK implementation.
//
// The mock returns a fake detection ~25% of the time so the rest of the pipeline
// (tracker → GPS tagging → buffer → sync → dashboard) can be verified before real
// on-device TFLite inference is wired up.
//
// ── Real on-device YOLO (deferred — Phase 3e) ──────────────────────────────
// The pieces needed:
//   1. A vision-camera v5-compatible resize plugin (the current one targets v4 only).
//   2. Re-enable react-native-worklets-core/plugin in babel.config.js.
//   3. Inside the frame processor:
//        const resized = resize(frame, { scale: { width: 640, height: 640 },
//                                        pixelFormat: 'rgb', dataType: 'float32' });
//        const out = model.runSync([resized]);
//        return decodeYolo(out, conf=0.4);
//   4. decodeYolo(): YOLOv8 TFLite output is shape [1, 4+num_classes, num_anchors].
//      For each anchor i:
//        - x_center, y_center, w, h = out[0..3][i]   (normalized 0..1)
//        - classScores = out[4..][i]
//        - pick max class score; if > conf threshold, keep this box.
//      Then run NMS (non-maximum suppression) on the kept boxes to merge overlaps.
//   5. Map class index → Severity (0=minor, 1=moderate, 2=severe), or if the model
//      is single-class, derive severity from bboxArea via the size rule.
//
// Alternative: server-side inference. Phone takes photos, uploads to backend, backend
// runs the ONNX model and returns detections. Simpler code, needs constant connectivity.
// ───────────────────────────────────────────────────────────────────────────────
import uuid from 'react-native-uuid';
import type { Hole, Severity } from '../types/api';

export type PendingHole = Omit<Hole, 'lat' | 'lng'>;

// Probability a single snapshot "detects" a hole. Tweak while testing the pipeline.
const MOCK_HIT_RATE = 0.25;
const SEVERITIES: Severity[] = ['minor', 'moderate', 'severe'];

export function mockDetect(): PendingHole[] {
  if (Math.random() > MOCK_HIT_RATE) return [];
  const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
  return [
    {
      clientUuid: String(uuid.v4()),
      severity,
      confidence: 0.6 + Math.random() * 0.4,
      bboxArea: 0.02 + Math.random() * 0.08,
      detectedAt: new Date().toISOString(),
    },
  ];
}
