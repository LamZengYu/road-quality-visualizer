import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  deleteMap,
  deletePath,
  getMap,
  getMapStats,
  patchMap,
  patchPath,
  type StatsFilter,
} from '../api/maps';
import { SeverityBreakdown, ScoreOverTime, WorstPaths } from '../components/Charts';
import type { MapDetail, MapStats, Severity, Visibility } from '@rqv/shared';

const ALL_SEVERITIES: Severity[] = ['minor', 'moderate', 'severe'];

export default function MapDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [map, setMap] = useState<MapDetail | null>(null);
  const [stats, setStats] = useState<MapStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsVersion, setStatsVersion] = useState(0);
  const [error, setError] = useState('');

  // --- Filter state ---
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [severities, setSeverities] = useState<Severity[]>([...ALL_SEVERITIES]);

  const filter: StatsFilter = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      severities: severities.length === ALL_SEVERITIES.length ? undefined : severities,
    }),
    [from, to, severities],
  );

  const refreshMap = useCallback(async () => {
    if (!id) return;
    try {
      setMap(await getMap(Number(id)));
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e.message);
    }
  }, [id]);

  useEffect(() => {
    refreshMap();
  }, [refreshMap]);

  useEffect(() => {
    if (!id) return;
    setStatsLoading(true);
    getMapStats(Number(id), filter)
      .then(setStats)
      .catch((e) => setError(e?.response?.data?.error?.message ?? e.message))
      .finally(() => setStatsLoading(false));
  }, [id, filter, statsVersion]);

  function toggleSeverity(s: Severity) {
    setSeverities((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    );
  }
  function resetFilters() {
    setFrom('');
    setTo('');
    setSeverities([...ALL_SEVERITIES]);
  }

  async function renameMap() {
    if (!map) return;
    const next = window.prompt('Rename map:', map.name);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === map.name) return;
    try {
      await patchMap(map.id, { name: trimmed });
      await refreshMap();
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? e.message);
    }
  }

  async function toggleVisibility() {
    if (!map) return;
    const next: Visibility = map.visibility === 'private' ? 'public' : 'private';
    try {
      await patchMap(map.id, { visibility: next });
      await refreshMap();
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? e.message);
    }
  }

  async function removeMap() {
    if (!map) return;
    const ok = window.confirm(
      `Delete map "${map.name}"?\nThis removes ${map.paths.length} path(s) and all their holes. Cannot be undone.`,
    );
    if (!ok) return;
    try {
      await deleteMap(map.id);
      navigate('/');
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? e.message);
    }
  }

  async function renamePath(pid: number, current: string) {
    const next = window.prompt('Rename path:', current);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === current) return;
    try {
      await patchPath(pid, { name: trimmed });
      await refreshMap();
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? e.message);
    }
  }

  async function removePath(pid: number, name: string) {
    const ok = window.confirm(
      `Delete path "${name}"?\nThis removes all holes and GPS points on this path. Cannot be undone.`,
    );
    if (!ok) return;
    try {
      await deletePath(pid);
      await refreshMap();
      setStatsVersion((v) => v + 1);
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? e.message);
    }
  }

  const anyFilterActive =
    from !== '' || to !== '' || severities.length !== ALL_SEVERITIES.length;

  if (error) return <p className="error">{error}</p>;
  if (!map) return <p>Loading…</p>;

  return (
    <div>
      <Link to="/" className="back">← Back to maps</Link>
      <div className="page-header">
        <h1 style={{ margin: 0 }}>{map.name}</h1>
        {map.isOwner && (
          <div className="header-actions">
            <button type="button" className="row-action" onClick={renameMap}>
              Rename
            </button>
            <button type="button" className="row-action" onClick={toggleVisibility}>
              Make {map.visibility === 'private' ? 'public' : 'private'}
            </button>
            <button
              type="button"
              className="row-action row-action-danger"
              onClick={removeMap}
            >
              Delete map
            </button>
          </div>
        )}
      </div>
      <p className="muted">
        Visibility: <strong>{map.visibility}</strong>
        {map.isOwner ? ' · you are the owner' : ' · read-only'}
      </p>

      <div className="filter-bar card">
        <div className="filter-group">
          <label>From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            max={to || undefined}
          />
        </div>
        <div className="filter-group">
          <label>To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from || undefined}
          />
        </div>
        <div className="filter-group">
          <label>Severity</label>
          <div className="sev-checks">
            {ALL_SEVERITIES.map((s) => (
              <label key={s} className="sev-check">
                <input
                  type="checkbox"
                  checked={severities.includes(s)}
                  onChange={() => toggleSeverity(s)}
                />
                <span className={`sev-pill sev-${s}`}>{s}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="secondary filter-reset"
          onClick={resetFilters}
          disabled={!anyFilterActive}
        >
          Reset
        </button>
      </div>
      <p className="muted filter-hint">
        Severity filter only affects the breakdown chart. Date range affects all three.
        {statsLoading && ' · loading…'}
      </p>

      {stats && (
        <div className="grid">
          <SeverityBreakdown data={stats.severityBreakdown} />
          <ScoreOverTime data={stats.scoreOverTime} />
          <WorstPaths data={stats.worstPaths} />
        </div>
      )}

      <h2>Paths in this map</h2>
      {map.paths.length === 0 ? (
        <div className="empty-box">
          <p className="muted" style={{ margin: 0 }}>
            No paths in this map yet. Run another scan on the mobile app under this
            map name to add one.
          </p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Scanned</th>
              <th>Length</th>
              <th>Grade</th>
              <th>Score</th>
              {map.isOwner && <th style={{ width: 1, whiteSpace: 'nowrap' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {map.paths.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/paths/${p.id}`}>{p.name}</Link>
                </td>
                <td>{new Date(p.scannedAt).toLocaleString()}</td>
                <td>{p.lengthM.toFixed(0)} m</td>
                <td>{p.grade ?? '-'}</td>
                <td>{p.score !== null ? p.score.toFixed(1) : '-'}</td>
                {map.isOwner && (
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="row-action"
                        onClick={() => renamePath(p.id, p.name)}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="row-action row-action-danger"
                        onClick={() => removePath(p.id, p.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
