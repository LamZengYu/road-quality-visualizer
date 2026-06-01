// Placeholder. With sparse mock detections (snapshot mode), each detection is
// already a finalized hole and we don't need cross-frame tracking.
//
// When real-time inference replaces the mock (Phase 3e), this becomes an IoU-based
// tracker:
//   - On each frame's detections, match to existing tracks by box-overlap (IoU).
//   - Unmatched detections start new tracks.
//   - Tracks not seen for N frames "exit" → finalize as ONE hole using the
//     best-confidence severity, max bbox area, and best GPS fix during its life.
import type { PendingHole } from './detector';

export function update(detections: PendingHole[]): PendingHole[] {
  // Snapshot-mode passthrough — each detection is finalized immediately.
  return detections;
}
