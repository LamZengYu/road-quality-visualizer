import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl, setApiBaseUrl } from '../api/client';

interface Preset {
  label: string;
  url: string;
  hint: string;
}

const PRESETS: Preset[] = [
  {
    label: 'Same-origin (/api)',
    url: '/api',
    hint:
      'Default. In dev, Vite proxies /api → http://localhost:3000. In prod served behind nginx/Caddy on the same host as the backend, this is also right.',
  },
  {
    label: 'Direct dev backend',
    url: 'http://localhost:3000/api',
    hint:
      'Skip the Vite proxy and hit the backend directly. Useful if you opened the web build from a file:// URL or a different host.',
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState(getApiBaseUrl());
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  function applyPreset(p: Preset) {
    setUrl(p.url);
    setTestResult(null);
  }

  async function testConnection() {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!trimmed) {
      setTestResult({ ok: false, msg: 'URL is empty' });
      return;
    }
    setBusy(true);
    setTestResult(null);
    try {
      const { data } = await axios.get(`${trimmed}/health`, { timeout: 5000 });
      if (data?.ok) {
        setTestResult({
          ok: true,
          msg: `Connected — ${trimmed}/health returned OK`,
        });
      } else {
        setTestResult({
          ok: false,
          msg: `Reached the server but /health didn't return { ok: true }`,
        });
      }
    } catch (e: any) {
      const reason =
        e?.code === 'ECONNABORTED' ? 'timeout' : e?.message ?? 'unknown error';
      setTestResult({
        ok: false,
        msg: `Could not reach ${trimmed}/health — ${reason}`,
      });
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const trimmed = url.trim();
    if (!trimmed) {
      alert('URL is empty. Enter a value before saving.');
      return;
    }
    // Relative '/api' is allowed (same-origin proxy). Otherwise require scheme.
    if (!trimmed.startsWith('/') && !/^https?:\/\//i.test(trimmed)) {
      alert('URL must start with /, http://, or https://');
      return;
    }
    setApiBaseUrl(trimmed);
    alert(`Saved — backend set to: ${trimmed.replace(/\/+$/, '')}`);
    navigate(-1);
  }

  return (
    <div>
      <a className="back" onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
        ← Back
      </a>
      <h1>Backend connection</h1>
      <p className="muted">
        The dashboard talks to a backend API. This page lets you choose which
        one — useful for switching between local dev and a deployed backend.
        The URL is saved in your browser's localStorage and persists across
        page reloads.
      </p>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Backend URL</h3>
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setTestResult(null);
          }}
          placeholder="/api  or  http://192.168.1.100:3000/api"
          spellCheck={false}
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Must end with <code>/api</code>. The "Test connection" button hits{' '}
          <code>&lt;url&gt;/health</code>.
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={testConnection}
            disabled={busy}
            className="row-action"
            style={{ flex: 1 }}>
            {busy ? 'Testing…' : 'Test connection'}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            style={{ flex: 1, margin: 0 }}>
            Save
          </button>
        </div>

        {testResult && (
          <div
            className="result-box"
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 6,
              background: testResult.ok ? '#e8f6ec' : '#fdecea',
              color: testResult.ok ? '#1e6431' : '#a72a1d',
              fontSize: 13,
            }}>
            {testResult.ok ? '✓ ' : '✗ '}
            {testResult.msg}
          </div>
        )}
      </div>

      <h2>Presets</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PRESETS.map((p) => (
          <div
            key={p.url}
            className="card"
            style={{ padding: 12, cursor: 'pointer' }}
            onClick={() => applyPreset(p)}>
            <div style={{ fontWeight: 600 }}>{p.label}</div>
            <code style={{ fontSize: 12, color: '#345' }}>{p.url}</code>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
              {p.hint}
            </p>
          </div>
        ))}
      </div>

      <h2>Pointing at a deployed backend</h2>
      <p className="muted">
        If you've deployed the backend to e.g.{' '}
        <code>https://api.example.com</code>, enter{' '}
        <code>https://api.example.com/api</code> above. Cross-origin is fine
        — the backend has CORS enabled. The browser will preflight requests as
        usual.
      </p>
    </div>
  );
}
