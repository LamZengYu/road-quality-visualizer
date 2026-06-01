import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteMap, listMaps, patchMap } from '../api/maps';
import type { MapSummary } from '@rqv/shared';

export default function DashboardPage() {
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setMaps(await listMaps());
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function rename(m: MapSummary) {
    const next = window.prompt('Rename map:', m.name);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === m.name) return;
    try {
      await patchMap(m.id, { name: trimmed });
      await refresh();
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? e.message);
    }
  }

  async function remove(m: MapSummary) {
    const ok = window.confirm(
      `Delete map "${m.name}"?\nThis removes ${m.pathCount} path(s) and all their holes. Cannot be undone.`,
    );
    if (!ok) return;
    try {
      await deleteMap(m.id);
      await refresh();
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? e.message);
    }
  }

  if (loading && maps.length === 0) return <p>Loading…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h1>Maps</h1>
      {maps.length === 0 ? (
        <div className="empty-box">
          <h3 style={{ marginTop: 0 }}>No maps yet</h3>
          <p className="muted" style={{ margin: 0 }}>
            Open the mobile app, start a scan, then tap <strong>Sync now</strong>.
            Once a scan uploads it becomes a map here.
          </p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Paths</th>
              <th>Avg score</th>
              <th>Visibility</th>
              <th style={{ width: 1, whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {maps.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link to={`/maps/${m.id}`}>{m.name}</Link>
                  {m.isOwner ? '' : ' (public)'}
                </td>
                <td>{m.pathCount}</td>
                <td>{m.avgScore !== null ? m.avgScore.toFixed(1) : '-'}</td>
                <td>{m.visibility}</td>
                <td>
                  {m.isOwner ? (
                    <div className="row-actions">
                      <button
                        type="button"
                        className="row-action"
                        onClick={() => rename(m)}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="row-action row-action-danger"
                        onClick={() => remove(m)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <span className="muted" style={{ fontSize: 11 }}>read-only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
