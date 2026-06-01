import axios from 'axios';
import { loadToken } from '../storage/token';
import { loadBaseUrl, saveBaseUrl, DEFAULT_BASE_URL } from '../storage/settings';

// baseURL is configurable at runtime via the Settings page. Default is '/api'
// (relative — uses the Vite proxy in dev, or same-origin in prod). Users on a
// deployed setup can switch to e.g. 'https://api.example.com/api'.
//
// localStorage is synchronous so we can read it at module load time — no boot
// ordering issues like the mobile app has with AsyncStorage.
export const api = axios.create({ baseURL: loadBaseUrl() });

api.interceptors.request.use((cfg) => {
  const t = loadToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export function setApiBaseUrl(url: string): void {
  const trimmed = url.trim().replace(/\/+$/, '');
  saveBaseUrl(trimmed);
  api.defaults.baseURL = trimmed;
}

export function getApiBaseUrl(): string {
  return api.defaults.baseURL ?? DEFAULT_BASE_URL;
}
