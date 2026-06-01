const BASE_URL_KEY = 'rqv.baseUrl';

// Default = relative '/api'. In dev this hits the Vite proxy (vite.config.ts
// forwards /api → http://localhost:3000). In a production build served behind
// nginx/Caddy on the same host as the backend, '/api' just hits same-origin.
// Users who want to point at a different backend host (e.g. a deployed API
// at https://api.example.com/api) override this via the Settings page.
export const DEFAULT_BASE_URL = '/api';

export function loadBaseUrl(): string {
  const v = localStorage.getItem(BASE_URL_KEY);
  return v && v.trim().length > 0 ? v : DEFAULT_BASE_URL;
}

export function saveBaseUrl(url: string): void {
  localStorage.setItem(BASE_URL_KEY, url);
}

export function clearBaseUrl(): void {
  localStorage.removeItem(BASE_URL_KEY);
}
