// Mobile equivalents of web/src/components/Charts.tsx (SeverityBreakdown,
// ScoreOverTime, WorstPaths). Drawn with react-native-svg primitives so we
// don't need a charting library. Same severity colors as the web.
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Polyline, Line, G, Text as SvgText } from 'react-native-svg';
import { sevColor } from './SchematicMap';

type Severity = 'minor' | 'moderate' | 'severe';
type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

const CARD_W = 320;
const CHART_H = 160;
const PAD_L = 32;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 24;

const SEVS: Severity[] = ['minor', 'moderate', 'severe'];

export function SeverityBreakdown({ data }: { data: Record<Severity, number> }) {
  const max = Math.max(1, ...SEVS.map((s) => data[s]));
  const innerW = CARD_W - PAD_L - PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;
  const barW = innerW / SEVS.length - 12;

  return (
    <View style={s.card}>
      <Text style={s.title}>Severity breakdown</Text>
      <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CARD_W} ${CHART_H}`}>
        <Line
          x1={PAD_L}
          y1={CHART_H - PAD_B}
          x2={CARD_W - PAD_R}
          y2={CHART_H - PAD_B}
          stroke="#ddd"
        />
        {[0, 0.5, 1].map((t) => {
          const y = PAD_T + innerH * (1 - t);
          return (
            <SvgText key={t} x={PAD_L - 4} y={y + 3} fontSize={9} fill="#888" textAnchor="end">
              {Math.round(max * t)}
            </SvgText>
          );
        })}
        {SEVS.map((sev, i) => {
          const v = data[sev];
          const x = PAD_L + i * (innerW / SEVS.length) + 6;
          const h = innerH * (v / max);
          const y = PAD_T + innerH - h;
          return (
            <G key={sev}>
              <Rect x={x} y={y} width={barW} height={h} fill={sevColor[sev]} />
              <SvgText
                x={x + barW / 2}
                y={CHART_H - PAD_B + 14}
                fontSize={11}
                fill="#444"
                textAnchor="middle">
                {sev}
              </SvgText>
              <SvgText
                x={x + barW / 2}
                y={y - 4}
                fontSize={11}
                fontWeight="bold"
                fill="#222"
                textAnchor="middle">
                {v}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

export function ScoreOverTime({ data }: { data: { date: string; avgScore: number }[] }) {
  return (
    <View style={s.card}>
      <Text style={s.title}>Avg score over time</Text>
      {data.length === 0 ? (
        <Text style={s.muted}>No scored paths yet.</Text>
      ) : (
        <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CARD_W} ${CHART_H}`}>
          {renderLine(data)}
        </Svg>
      )}
    </View>
  );
}

function renderLine(data: { date: string; avgScore: number }[]) {
  const innerW = CARD_W - PAD_L - PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;
  const xStep = data.length === 1 ? 0 : innerW / (data.length - 1);
  // Y is fixed to 0-100 (score range).
  const yFor = (v: number) => PAD_T + innerH * (1 - Math.max(0, Math.min(100, v)) / 100);
  const pts = data.map((d, i) => `${PAD_L + i * xStep},${yFor(d.avgScore)}`).join(' ');

  // Axis ticks
  const ticks = [0, 50, 100];
  return (
    <>
      {ticks.map((t) => {
        const y = yFor(t);
        return (
          <G key={t}>
            <Line x1={PAD_L} y1={y} x2={CARD_W - PAD_R} y2={y} stroke="#eee" />
            <SvgText
              x={PAD_L - 4}
              y={y + 3}
              fontSize={9}
              fill="#888"
              textAnchor="end">
              {t}
            </SvgText>
          </G>
        );
      })}
      <Polyline points={pts} fill="none" stroke="#2c3e50" strokeWidth={2} />
      {data.map((d, i) => (
        <Rect
          key={`p-${i}`}
          x={PAD_L + i * xStep - 2}
          y={yFor(d.avgScore) - 2}
          width={4}
          height={4}
          fill="#2c3e50"
        />
      ))}
      {/* first + last date label only */}
      {data.length > 0 && (
        <SvgText
          x={PAD_L}
          y={CHART_H - PAD_B + 14}
          fontSize={9}
          fill="#888"
          textAnchor="start">
          {data[0].date}
        </SvgText>
      )}
      {data.length > 1 && (
        <SvgText
          x={CARD_W - PAD_R}
          y={CHART_H - PAD_B + 14}
          fontSize={9}
          fill="#888"
          textAnchor="end">
          {data[data.length - 1].date}
        </SvgText>
      )}
    </>
  );
}

export function WorstPaths({
  data,
}: {
  data: { pathId: number; name: string; score: number; grade: Grade }[];
}) {
  return (
    <View style={s.card}>
      <Text style={s.title}>Worst paths</Text>
      {data.length === 0 ? (
        <Text style={s.muted}>No scored paths yet.</Text>
      ) : (
        <View>
          {data.map((p, i) => (
            <Text key={p.pathId} style={s.worstRow}>
              {i + 1}. {p.name} — {p.score.toFixed(1)}{' '}
              <Text style={{ fontWeight: '700' }}>({p.grade})</Text>
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    padding: 12,
    marginBottom: 10,
  },
  title: {
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#666',
    marginBottom: 6,
  },
  muted: { color: '#888', padding: 10 },
  worstRow: { fontSize: 13, paddingVertical: 4 },
});
