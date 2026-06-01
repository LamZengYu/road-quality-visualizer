import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPath } from '../api/maps';
import { SchematicMap } from '../components/SchematicMap';
import type { PathDetail, Grade } from '@rqv/shared';

export default function PathDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [path, setPath] = useState<PathDetail | null>(null);
  const [error, setError] = useState('');
  const [selectedHoleId, setSelectedHoleId] = useState<number | null>(null);
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (!id) return;
    getPath(Number(id))
      .then(setPath)
      .catch((e) => setError(e?.response?.data?.error?.message ?? e.message));
  }, [id]);

  useEffect(() => {
    if (selectedHoleId == null) return;
    const row = rowRefs.current[selectedHoleId];
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedHoleId]);

  if (error) return <p className="error">{error}</p>;
  if (!path) return <p>Loading…</p>;

  const grade: Grade = path.grade ?? 'C';

  return (
    <div>
      <Link to={`/maps/${path.mapId}`} className="back">← Back to map</Link>
      <h1>{path.name}</h1>
      <p className="muted">
        Length: <strong>{path.lengthM.toFixed(0)} m</strong> · Grade{' '}
        <strong>{path.grade ?? '-'}</strong> · Score{' '}
        <strong>{path.score !== null ? path.score.toFixed(1) : '-'}</strong> ·{' '}
        {path.holeCount} holes · scanned{' '}
        {new Date(path.scannedAt).toLocaleString()}
      </p>

      <div className="card" style={{ marginTop: 12 }}>
        <SchematicMap
          variant="detail"
          grade={grade}
          points={path.points}
          holes={path.holes.map((h) => ({
            id: h.id,
            lat: h.lat,
            lng: h.lng,
            severity: h.severity,
            score: h.score,
            confidence: h.confidence,
          }))}
          selectedHoleId={selectedHoleId}
          onHoleClick={(hid) =>
            setSelectedHoleId((cur) => (cur === hid ? null : hid))
          }
        />
      </div>

      <h2>Holes ({path.holes.length})</h2>
      {path.holes.length === 0 ? (
        <p className="muted">No holes on this path.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Severity</th>
              <th>Score</th>
              <th>Confidence</th>
              <th>Position</th>
              <th>Detected at</th>
            </tr>
          </thead>
          <tbody>
            {path.holes.map((h, i) => {
              const isSelected = h.id !== undefined && h.id === selectedHoleId;
              return (
                <tr
                  key={h.id}
                  ref={(el) => {
                    if (h.id !== undefined) rowRefs.current[h.id] = el;
                  }}
                  onClick={() => {
                    if (h.id !== undefined) {
                      setSelectedHoleId((cur) => (cur === h.id ? null : h.id!));
                    }
                  }}
                  className={isSelected ? 'row-selected' : 'row-clickable'}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{i + 1}</td>
                  <td>{h.severity}</td>
                  <td>{h.score !== undefined ? h.score.toFixed(2) : '-'}</td>
                  <td>{h.confidence !== undefined ? h.confidence.toFixed(2) : '-'}</td>
                  <td>{h.lat.toFixed(5)}, {h.lng.toFixed(5)}</td>
                  <td>{new Date(h.detectedAt).toLocaleTimeString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
