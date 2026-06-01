import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL_KEY = 'rqv.baseUrl';

// Default baseURL = USB / adb-reverse workflow. Users on Wi-Fi switch this in
// the in-app Settings screen.
export const DEFAULT_BASE_URL = 'http://localhost:3000/api';

export async function loadBaseUrl(): Promise<string> {
  const v = await AsyncStorage.getItem(BASE_URL_KEY);
  return v && v.trim().length > 0 ? v : DEFAULT_BASE_URL;
}

export async function saveBaseUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(BASE_URL_KEY, url);
}

export async function clearBaseUrl(): Promise<void> {
  await AsyncStorage.removeItem(BASE_URL_KEY);
}
