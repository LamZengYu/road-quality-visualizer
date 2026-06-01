import Geolocation from 'react-native-geolocation-service';

// --- Tunables -------------------------------------------------------------
// Drop fixes whose horizontal accuracy is worse than this (i.e. the radio is
// unsure about lat/lng by more than N meters). Outdoor good = ~5 m; first few
// seconds of a cold lock often = 20-50 m. We treat anything above this as junk
// rather than letting it pollute the trace.
const MIN_ACCURACY_M = 15;
// --------------------------------------------------------------------------

export interface Fix {
  lat: number;
  lng: number;
  ts: number;        // epoch ms
  accuracy?: number; // meters — kept on the Fix for future debug UI, not sent up
}

let current: Fix | null = null;
let watchId: number | null = null;
const trace: Fix[] = [];
// Diagnostic counters — exposed via getGpsDiagnostics() if a screen wants to
// surface "X fixes rejected" while the user is figuring out signal quality.
let rejectedAccuracy = 0;
let acceptedFixes = 0;

export function getCurrentFix(): Fix | null {
  return current;
}
export function getTrace(): Fix[] {
  return [...trace];
}
export function clearTrace(): void {
  trace.length = 0;
  current = null;
  rejectedAccuracy = 0;
  acceptedFixes = 0;
}

export function getGpsDiagnostics() {
  return { rejectedAccuracy, acceptedFixes, traceLen: trace.length };
}

export function startWatching(): void {
  if (watchId !== null) return;
  watchId = Geolocation.watchPosition(
    (pos) => {
      const acc = pos.coords.accuracy ?? Infinity;
      // Quality gate: junk fixes never enter `current` or the trace, so
      // photos captured during a brief radio glitch don't get misplaced.
      if (acc > MIN_ACCURACY_M) {
        rejectedAccuracy++;
        return;
      }
      const fix: Fix = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        ts: Date.now(),
        accuracy: acc,
      };
      current = fix;
      acceptedFixes++;
      // Throttle: only append to the trace if we've moved >2 m from the last point.
      const last = trace[trace.length - 1];
      if (!last || haversineMeters(last, fix) > 2) trace.push(fix);
    },
    () => {},
    {
      enableHighAccuracy: true,
      distanceFilter: 1,
      interval: 1000,
      fastestInterval: 500,
    },
  );
}

export function stopWatching(): void {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function haversineMeters(a: Fix, b: Fix): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
