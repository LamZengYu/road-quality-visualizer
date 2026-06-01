import type { Grade, Severity } from "@rqv/shared";
import { summarizeWaypoints } from "./pathGeometry";

const W = 600,
  H = 400,
  PAD = 20;
const gradeColor: Record<Grade, string> = {
  A: "#2ecc71",
  B: "#a3cb38",
  C: "#f1c40f",
  D: "#e67e22",
  F: "#e74c3c",
};
const sevColor: Record<Severity, string> = {
  minor: "#f1c40f",
  moderate: "#e67e22",
  severe: "#e74c3c",
};

type Pt = { lat: number; lng: number };
type HolePt = Pt & {
  id?: number;
  severity: Severity;
  score?: number;
  confidence?: number;
};

// Fit all lat/lng into the box (min-max normalize), flip Y so north is up.
function projector(points: Pt[], holes: Pt[]) {
  const all = [...points, ...holes];
  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);
  const minLat = Math.min(...lats),
    maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs),
    maxLng = Math.max(...lngs);
  const sx = (W - 2 * PAD) / (maxLng - minLng || 1);
  const sy = (H - 2 * PAD) / (maxLat - minLat || 1);
  return (p: Pt) => ({
    x: PAD + (p.lng - minLng) * sx,
    y: H - PAD - (p.lat - minLat) * sy,
  });
}

interface SchematicMapProps {
  grade: Grade;
  points: Pt[];
  holes: HolePt[];
  variant?: "compact" | "detail";
  selectedHoleId?: number | null;
  onHoleClick?: (id: number) => void;
}

export function SchematicMap({
  grade,
  points,
  holes,
  variant = "compact",
  selectedHoleId = null,
  onHoleClick,
}: SchematicMapProps) {
  if (points.length === 0) return <p>No GPS trace for this path.</p>;

  const detail = variant === "detail";
  const to = projector(points, holes);
  const line = points
    .map((p) => {
      const q = to(p);
      return `${q.x},${q.y}`;
    })
    .join(" ");

  const baseR = detail ? 11 : 5;
  // Detect interesting waypoints (start, end, direction changes) — only used
  // in detail mode. In compact mode we don't even compute them.
  const waypoints = detail ? summarizeWaypoints(points) : [];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: "#f4f4f4" }}>
        <polyline points={line} fill="none" stroke={gradeColor[grade]} strokeWidth={4} />

        {detail &&
          waypoints.map((w, i) => {
            const q = to(w);
            const labelDist = `${Math.round(w.distFromStartM)} m`;
            const labelKind =
              w.kind === 'start' ? 'start' : w.kind === 'end' ? 'end' : '';
            return (
              <g key={`wp-${i}`}>
                <circle cx={q.x} cy={q.y} r={5} fill="#222" />
                <text
                  x={q.x + 8}
                  y={q.y - 6}
                  fontSize={11}
                  fontWeight={600}
                  fill="#222">
                  {labelDist}
                </text>
                {labelKind !== '' && (
                  <text
                    x={q.x + 8}
                    y={q.y + 12}
                    fontSize={10}
                    fill="#666">
                    {labelKind}
                  </text>
                )}
              </g>
            );
          })}

        {holes.map((h, i) => {
          const q = to(h);
          const selected = h.id !== undefined && h.id === selectedHoleId;
          // Confidence-based opacity (only in detail mode, when confidence known).
          const op = detail && h.confidence !== undefined
            ? 0.4 + Math.max(0, Math.min(1, h.confidence)) * 0.6
            : 1;
          return (
            <g
              key={h.id ?? i}
              style={{ cursor: detail && onHoleClick && h.id !== undefined ? "pointer" : "default" }}
              onClick={() => {
                if (detail && onHoleClick && h.id !== undefined) onHoleClick(h.id);
              }}
            >
              <title>
                {`#${i + 1} · ${h.severity}` +
                  (h.score !== undefined ? ` · score ${h.score.toFixed(1)}` : "") +
                  (h.confidence !== undefined ? ` · confidence ${(h.confidence * 100).toFixed(0)}%` : "")}
              </title>
              <circle
                cx={q.x}
                cy={q.y}
                r={selected ? baseR + 4 : baseR}
                fill={sevColor[h.severity]}
                fillOpacity={op}
                stroke={selected ? "#1565c0" : detail ? "white" : "none"}
                strokeWidth={selected ? 3 : detail ? 1.5 : 0}
              />
              {detail && (
                <text
                  x={q.x}
                  y={q.y + 4}
                  fontSize={11}
                  fontWeight={600}
                  textAnchor="middle"
                  fill="white"
                  pointerEvents="none"
                >
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {detail && (
        <div className="map-legend">
          <span className="legend-line">
            <span
              className="legend-swatch"
              style={{ background: gradeColor[grade], height: 3 }}
            />
            path (grade {grade})
          </span>
          <span className="legend-line">
            <span className="legend-dot" style={{ background: sevColor.minor }} />
            minor
          </span>
          <span className="legend-line">
            <span className="legend-dot" style={{ background: sevColor.moderate }} />
            moderate
          </span>
          <span className="legend-line">
            <span className="legend-dot" style={{ background: sevColor.severe }} />
            severe
          </span>
          <span className="legend-hint">
            Click a marker (or a table row) to highlight.
          </span>
        </div>
      )}
    </div>
  );
}
