// Local copy of shared/src/index.ts. If you change the shared types,
// mirror them here (mobile isn't an npm workspace because RN/Metro
// doesn't follow symlinks outside the project root cleanly).

export type Severity = "minor" | "moderate" | "severe";
export type Grade = "A" | "B" | "C" | "D" | "F";
export type Visibility = "private" | "public";

export interface PathPoint {
  seq: number;
  lat: number;
  lng: number;
  ts: string; // ISO-8601 UTC
}

export interface Hole {
  id?: number;
  clientUuid: string;
  lat: number;
  lng: number;
  severity: Severity;
  score?: number;
  confidence?: number;
  bboxArea?: number;
  thumbUrl?: string | null;
  detectedAt: string;
}

export interface AuthRequest { email: string; password: string; }
export interface AuthResponse { token: string; }

export interface IngestScanRequest {
  mapName: string;
  path: { clientUuid: string; name: string; scannedAt: string };
  holes: Hole[];
  points: PathPoint[];
}
export interface IngestScanResponse {
  pathId: number;
  score: number;
  grade: Grade;
  holeCount: number;
}

export interface MapSummary {
  id: number;
  name: string;
  visibility: Visibility;
  isOwner: boolean;
  pathCount: number;
  avgScore: number | null;
}
export interface PathSummary {
  id: number;
  name: string;
  score: number | null;
  grade: Grade | null;
  lengthM: number;
  scannedAt: string; // ISO-8601 UTC
}
export interface MapDetail {
  id: number;
  name: string;
  visibility: Visibility;
  isOwner: boolean;
  paths: PathSummary[];
}
export interface PathDetail {
  id: number;
  mapId: number;
  name: string;
  lengthM: number;
  holeCount: number;
  score: number | null;
  grade: Grade | null;
  scannedAt: string;
  holes: Hole[];
  points: Pick<PathPoint, "seq" | "lat" | "lng">[];
}

export interface MapStats {
  severityBreakdown: Record<Severity, number>;
  scoreOverTime: { date: string; avgScore: number }[];
  worstPaths: { pathId: number; name: string; score: number; grade: Grade }[];
}
