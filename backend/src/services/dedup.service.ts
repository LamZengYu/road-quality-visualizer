// GPS-cluster dedup backstop: collapse near-duplicate holes, keeping the most severe.
// See docs/architecture.md "Deduplication".
import type { Hole, Severity } from "@rqv/shared";
import { haversineMeters } from "../util/geo";

const MERGE_DIST_M = 4; // holes within this distance are treated as the same hole
const SEV_RANK: Record<Severity, number> = { minor: 1, moderate: 2, severe: 3 };

export function clusterHoles(holes: Hole[]): Hole[] {
  const clusters: Hole[] = [];
  for (const h of holes) {
    const near = clusters.find((c) => haversineMeters(c, h) < MERGE_DIST_M);
    if (near) {
      if (SEV_RANK[h.severity] > SEV_RANK[near.severity]) near.severity = h.severity;
      near.bboxArea = Math.max(near.bboxArea ?? 0, h.bboxArea ?? 0);
      near.confidence = Math.max(near.confidence ?? 0, h.confidence ?? 0);
    } else {
      clusters.push({ ...h });
    }
  }
  return clusters;
}
