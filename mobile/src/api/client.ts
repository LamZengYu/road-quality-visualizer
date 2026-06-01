import axios from 'axios';
import { loadToken } from '../storage/token';
import { DEFAULT_BASE_URL, loadBaseUrl, saveBaseUrl } from '../storage/settings';

// The baseURL is configurable at runtime via the in-app Settings screen
// (persisted in AsyncStorage). The defaults file ships USB-friendly:
//   localhost:3000/api   ← requires `adb reverse tcp:3000 tcp:3000`
//
// Common alternatives a user might pick in Settings:
//   http://10.0.2.2:3000/api          (Android emulator)
//   http://192.168.1.100:3000/api     (real phone on same Wi-Fi as PC)
//   https://api.example.com/api       (deployed backend, Phase 7)
export const api = axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (cfg) => {
  const token = await loadToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Call this once at app start so axios uses whatever URL the user saved last.
export async function initApiBaseUrl(): Promise<string> {
  const url = await loadBaseUrl();
  api.defaults.baseURL = url;
  return url;
}

// Persist + apply a new baseURL (called from the Settings screen).
export async function setApiBaseUrl(url: string): Promise<void> {
  const trimmed = url.trim().replace(/\/+$/, ''); // strip trailing slashes
  await saveBaseUrl(trimmed);
  api.defaults.baseURL = trimmed;
}

export function getApiBaseUrl(): string {
  return api.defaults.baseURL ?? DEFAULT_BASE_URL;
}
