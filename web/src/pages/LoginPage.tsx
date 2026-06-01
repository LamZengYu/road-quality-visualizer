import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function go(action: 'login' | 'register') {
    setError('');
    setBusy(true);
    try {
      if (action === 'login') await login(email, password);
      else await register(email, password);
      navigate('/');
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="login-box"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) go('login');
      }}>
      <h2>Sign in</h2>
      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
      />
      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? '…' : 'Log in'}
      </button>
      <button
        type="button"
        onClick={() => go('register')}
        disabled={busy}
        className="secondary">
        Register new account
      </button>
    </form>
  );
}
