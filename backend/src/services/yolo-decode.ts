// Server-side port of the YOLO output decoder + NMS that we originally wrote for
// the mobile worklet. Same algorithm, plain TS (no worklet directives).
import type { Severity } from "@rqv/shared";

export interface RawDetection {
  box: { x: number; y: number; w: number; h: number }; // normalized 0..1
  classIdx: number;
  confidence: number;
  severity: Severity;
}

const CLASS_SEV: Severity[] = ["minor", "moderate", "severe"];

export function decodeYolo(
  output: Float32Array,
  shape: readonly number[],
  confThreshold: number,
  iouThreshold: number
): RawDetection[] {
  // Detect [1, 4+C, A] (channels-second) vs [1, A, 4+C].
  const dim1 = shape[1];
  const dim2 = shape[2];
  const channelsSecond = dim1 < dim2;
  const C = channelsSecond ? dim1 - 4 : dim2 - 4;
  const A = channelsSecond ? dim2 : dim1;

  const cand: { x: number; y: number; w: number; h: number; classIdx: number; confidence: number }[] = [];

  for (let i = 0; i < A; i++) {
    const x = channelsSecond ? output[0 * A + i] : output[i * (4 + C) + 0];
    const y = channelsSecond ? output[1 * A + i] : output[i * (4 + C) + 1];
    const w = channelsSecond ? output[2 * A + i] : output[i * (4 + C) + 2];
    const h = channelsSecond ? output[3 * A + i] : output[i * (4 + C) + 3];

    let bestScore = 0;
    let bestClass = -1;
    for (let c = 0; c < C; c++) {
      const s = channelsSecond ? output[(4 + c) * A + i] : output[i * (4 + C) + 4 + c];
      if (s > bestScore) {
        bestScore = s;
        bestClass = c;
      }
    }
    if (bestScore >= confThreshold && bestClass >= 0) {
      cand.push({ x, y, w, h, classIdx: bestClass, confidence: bestScore });
    }
  }

  cand.sort((a, b) => b.confidence - a.confidence);
  const kept: typeof cand = [];
  for (const c of cand) {
    let suppress = false;
    for (const k of kept) {
      if (iou(c, k) > iouThreshold) {
        suppress = true;
        break;
      }
    }
    if (!suppress) kept.push(c);
  }

  return kept.map((k) => ({
    box: { x: k.x, y: k.y, w: k.w, h: k.h },
    classIdx: k.classIdx,
    confidence: k.confidence,
    severity: C >= 3 ? CLASS_SEV[k.classIdx] : areaToSeverity(k.w * k.h),
  }));
}

function iou(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): number {
  const ax1 = a.x - a.w / 2, ay1 = a.y - a.h / 2;
  const ax2 = a.x + a.w / 2, ay2 = a.y + a.h / 2;
  const bx1 = b.x - b.w / 2, by1 = b.y - b.h / 2;
  const bx2 = b.x + b.w / 2, by2 = b.y + b.h / 2;
  const ix1 = Math.max(ax1, bx1), iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2), iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1), ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

function areaToSeverity(area: number): Severity {
  if (area < 0.02) return "minor";
  if (area < 0.05) return "moderate";
  return "severe";
}
