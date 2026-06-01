// Shared data types used by backend, web, and mobile.
// This is the single source of truth for the shapes in docs/api-contract.md.

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
  score?: number; // computed by the backend (authoritative)
  confidence?: number;
  bboxArea?: number;
  thumbUrl?: string | null;
  detectedAt: string; // ISO-8601 UTC
}

// ---- Auth ----
export interface AuthRequest {
  email: string;
  password: string;
}
export interface AuthResponse {
  token: string;
}

// ---- Ingest (phone -> backend) ----
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

// ---- Reads ----
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
  scannedAt: string; // ISO-8601 UTC — so clients can disambiguate same-name re-scans
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

export interface ApiError {
  error: { code: string; message: string };
}
