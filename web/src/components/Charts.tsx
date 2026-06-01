import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { Severity, Grade } from '@rqv/shared';

const SEV_COLOR: Record<Severity, string> = {
  minor: '#f1c40f',
  moderate: '#e67e22',
  severe: '#e74c3c',
};

export function SeverityBreakdown({ data }: { data: Record<Severity, number> }) {
  const chartData = (['minor', 'moderate', 'severe'] as Severity[]).map((s) => ({
    name: s,
    count: data[s],
  }));
  return (
    <div className="card">
      <h3>Severity breakdown</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count">
            {chartData.map((d) => (
              <Cell key={d.name} fill={SEV_COLOR[d.name]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreOverTime({ data }: { data: { date: string; avgScore: number }[] }) {
  return (
    <div className="card">
      <h3>Average score over time</h3>
      {data.length === 0 ? (
        <p className="muted">No scored paths yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="avgScore" stroke="#2c3e50" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function WorstPaths({
  data,
}: {
  data: { pathId: number; name: string; score: number; grade: Grade }[];
}) {
  return (
    <div className="card">
      <h3>Worst paths</h3>
      {data.length === 0 ? (
        <p className="muted">No scored paths yet.</p>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {data.map((p) => (
            <li key={p.pathId}>
              {p.name} — {p.score.toFixed(1)} <strong>({p.grade})</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
