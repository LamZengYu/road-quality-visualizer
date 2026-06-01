// Client-side geometry helpers for the schematic map: haversine distance,
// turn detection, cumulative distance per GPS point. Independent of the
// backend's util/geo.ts (different module system, can't import across that
// boundary easily).

export interface Pt {
  lat: number;
  lng: number;
}

export function haversineMeters(a: Pt, b: Pt): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Bearing in radians from a to b. Equirectangular approximation is fine for
// the short hops we care about (a few meters between consecutive points).
function bearingRad(a: Pt, b: Pt): number {
  return Math.atan2(b.lng - a.lng, b.lat - a.lat);
}

function angleDiffDeg(b1: number, b2: number): number {
  let diff = ((b2 - b1) * 180) / Math.PI;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return Math.abs(diff);
}

export interface Waypoint extends Pt {
  pointIndex: number;       // index in the original points array
  distFromStartM: number;
  kind: 'start' | 'end' | 'turn';
}

/**
 * Walks the GPS trace and returns the "interesting" points to label:
 *   - start (index 0)
 *   - end (last index)
 *   - any vertex where the heading changes more than `turnDegThreshold`
 *     compared to the previous *non-trivial* segment (≥ minLegM).
 *
 * Filtering by minLegM keeps GPS jitter on slow walks from generating fake
 * turns at every point.
 */
export function summarizeWaypoints(
  points: Pt[],
  opts: { turnDegThreshold?: number; minLegM?: number } = {},
): Waypoint[] {
  const turnDeg = opts.turnDegThreshold ?? 30;
  const minLeg = opts.minLegM ?? 8;
  if (points.length === 0) return [];

  // Cumulative distance per point.
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cum[i] = cum[i - 1] + haversineMeters(points[i - 1], points[i]);
  }

  const waypoints: Waypoint[] = [
    { ...points[0], pointIndex: 0, distFromStartM: 0, kind: 'start' },
  ];

  // For turn detection we track the index of the start of the current "leg"
  // and the bearing of the previous accepted leg.
  let prevLegStart = 0;
  let prevBearing: number | null = null;
  for (let i = 1; i < points.length; i++) {
    const legLen = cum[i] - cum[prevLegStart];
    if (legLen < minLeg) continue; // too short to give a reliable bearing
    const b = bearingRad(points[prevLegStart], points[i]);
    if (prevBearing !== null) {
      const change = angleDiffDeg(prevBearing, b);
      if (change >= turnDeg) {
        waypoints.push({
          ...points[prevLegStart],
          pointIndex: prevLegStart,
          distFromStartM: cum[prevLegStart],
          kind: 'turn',
        });
      }
    }
    prevBearing = b;
    prevLegStart = i;
  }

  const lastIdx = points.length - 1;
  if (lastIdx > 0) {
    waypoints.push({
      ...points[lastIdx],
      pointIndex: lastIdx,
      distFromStartM: cum[lastIdx],
      kind: 'end',
    });
  }
  return waypoints;
}
