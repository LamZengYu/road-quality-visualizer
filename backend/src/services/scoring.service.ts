// Single source of truth for scoring. See docs/scoring.md.
import type { Severity, Grade, PathPoint } from "@rqv/shared";
import { haversineMeters } from "../util/geo";

const WEIGHT: Record<Severity, number> = { minor: 1, moderate: 3, severe: 6 };
const REF_AREA = 0.05; // bbox area (fraction of frame) that counts as "big"
const K = 25; // path-score density penalty; tune against roads you'd grade by eye

export function holeScore(severity: Severity, bboxArea = 0): number {
  const sizeFactor = Math.min(Math.max(bboxArea / REF_AREA, 0), 1);
  return WEIGHT[severity] * (1 + sizeFactor);
}

export function pathScore(holes: { score: number }[], lengthM: number): number {
  if (lengthM <= 0) return holes.length === 0 ? 100 : 0; // no GPS trace fallback
  const sum = holes.reduce((a, h) => a + h.score, 0);
  const density = sum / (lengthM / 1000); // weighted holes per km
  return 100 * Math.exp(-density / K);
}

export function grade(score: number): Grade {
  return score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
}

export function lengthFromPoints(points: Pick<PathPoint, "lat" | "lng">[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++) m += haversineMeters(points[i - 1], points[i]);
  return m;
}
