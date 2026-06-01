import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapDetailPage from './pages/MapDetailPage';
import PathDetailPage from './pages/PathDetailPage';
import SettingsPage from './pages/SettingsPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, ready } = useAuth();
  if (!ready) return <p>Loading…</p>;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Header() {
  const { token, logout } = useAuth();
  return (
    <header className="topbar">
      <Link to="/" className="brand">Road Quality Visualizer</Link>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link to="/settings" className="header-link">Settings</Link>
        {token ? (
          <button onClick={logout} className="secondary">
            Log out
          </button>
        ) : null}
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Header />
        <main className="page">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/maps/:id"
              element={
                <RequireAuth>
                  <MapDetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="/paths/:id"
              element={
                <RequireAuth>
                  <PathDetailPage />
                </RequireAuth>
              }
            />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
