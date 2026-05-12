// @group Configuration : App configuration management via AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';

// @group Constants : Storage key constants
const KEYS = {
  SERVER_URL: '@ezpm2gui/server_url',
  AUTH_TOKEN: '@ezpm2gui/auth_token',
  REFRESH_INTERVAL: '@ezpm2gui/refresh_interval',
  THEME: '@ezpm2gui/theme',
} as const;

const DEFAULT_SERVER_URL = 'http://localhost:3101';
const DEFAULT_REFRESH_INTERVAL = 5;

// @group Configuration > ServerUrl : Server URL persistence
export async function getServerUrl(): Promise<string> {
  const url = await AsyncStorage.getItem(KEYS.SERVER_URL);
  return url ?? DEFAULT_SERVER_URL;
}

export async function setServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.SERVER_URL, url.replace(/\/$/, ''));
}

// @group Configuration > AuthToken : Auth token persistence
export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.AUTH_TOKEN);
}

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
}

// @group Configuration > RefreshInterval : Polling interval persistence
export async function getRefreshInterval(): Promise<number> {
  const val = await AsyncStorage.getItem(KEYS.REFRESH_INTERVAL);
  return val ? parseInt(val, 10) : DEFAULT_REFRESH_INTERVAL;
}

export async function setRefreshInterval(seconds: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.REFRESH_INTERVAL, String(seconds));
}

// @group Configuration > Theme : Theme persistence
export async function getTheme(): Promise<'dark' | 'light'> {
  const val = await AsyncStorage.getItem(KEYS.THEME);
  return (val as 'dark' | 'light') ?? 'dark';
}

export async function setTheme(theme: 'dark' | 'light'): Promise<void> {
  await AsyncStorage.setItem(KEYS.THEME, theme);
}

// @group Configuration > Reset : Full config reset
export async function clearAllConfig(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
