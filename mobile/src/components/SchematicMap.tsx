// Mobile port of web/src/components/SchematicMap.tsx — same projection + colors,
// drawn with react-native-svg primitives. "detail" variant matches the web's
// numbered/clickable markers; the on-press hits the same selectedHoleId state
// the parent passes in.
import Svg, { Polyline, Circle, G, Text as SvgText } from 'react-native-svg';
import { summarizeWaypoints } from './pathGeometry';

type Severity = 'minor' | 'moderate' | 'severe';
type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

const gradeColor: Record<Grade, string> = {
  A: '#2ecc71',
  B: '#a3cb38',
  C: '#f1c40f',
  D: '#e67e22',
  F: '#e74c3c',
};
const sevColor: Record<Severity, string> = {
  minor: '#f1c40f',
  moderate: '#e67e22',
  severe: '#e74c3c',
};

type Pt = { lat: number; lng: number };
type HolePt = Pt & {
  id?: number;
  severity: Severity;
  score?: number;
  confidence?: number;
};

const W = 320;
const H = 220;
const PAD = 14;

function projector(points: Pt[], holes: Pt[]) {
  const all = [...points, ...holes];
  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const sx = (W - 2 * PAD) / (maxLng - minLng || 1);
  const sy = (H - 2 * PAD) / (maxLat - minLat || 1);
  return (p: Pt) => ({
    x: PAD + (p.lng - minLng) * sx,
    y: H - PAD - (p.lat - minLat) * sy,
  });
}

interface Props {
  grade: Grade;
  points: Pt[];
  holes: HolePt[];
  variant?: 'compact' | 'detail';
  selectedHoleId?: number | null;
  onHoleClick?: (id: number) => void;
}

export function SchematicMap({
  grade,
  points,
  holes,
  variant = 'detail',
  selectedHoleId = null,
  onHoleClick,
}: Props) {
  if (points.length === 0) return null;
  const detail = variant === 'detail';
  const to = projector(points, holes);
  const line = points
    .map((p) => {
      const q = to(p);
      return `${q.x},${q.y}`;
    })
    .join(' ');
  const baseR = detail ? 9 : 4;
  const waypoints = detail ? summarizeWaypoints(points) : [];

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Polyline points={line} fill="none" stroke={gradeColor[grade]} strokeWidth={3} />
      {detail &&
        waypoints.map((w, i) => {
          const q = to(w);
          const labelDist = `${Math.round(w.distFromStartM)} m`;
          const labelKind =
            w.kind === 'start' ? 'start' : w.kind === 'end' ? 'end' : '';
          return (
            <G key={`wp-${i}`}>
              <Circle cx={q.x} cy={q.y} r={4} fill="#222" />
              <SvgText
                x={q.x + 6}
                y={q.y - 4}
                fontSize={9}
                fontWeight="bold"
                fill="#222">
                {labelDist}
              </SvgText>
              {labelKind !== '' && (
                <SvgText
                  x={q.x + 6}
                  y={q.y + 9}
                  fontSize={9}
                  fill="#666">
                  {labelKind}
                </SvgText>
              )}
            </G>
          );
        })}
      {holes.map((h, i) => {
        const q = to(h);
        const selected = h.id !== undefined && h.id === selectedHoleId;
        const op =
          detail && h.confidence !== undefined
            ? 0.4 + Math.max(0, Math.min(1, h.confidence)) * 0.6
            : 1;
        return (
          <G
            key={h.id ?? i}
            onPress={() => {
              if (onHoleClick && h.id !== undefined) onHoleClick(h.id);
            }}>
            <Circle
              cx={q.x}
              cy={q.y}
              r={selected ? baseR + 3 : baseR}
              fill={sevColor[h.severity]}
              fillOpacity={op}
              stroke={selected ? '#1565c0' : detail ? 'white' : 'none'}
              strokeWidth={selected ? 3 : detail ? 1.2 : 0}
            />
            {detail && (
              <SvgText
                x={q.x}
                y={q.y + 3}
                fontSize={9}
                fontWeight="bold"
                fill="white"
                textAnchor="middle">
                {i + 1}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

export { gradeColor, sevColor };
