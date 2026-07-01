import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_PORT = 4001;

function resolveBaseUrl(): string {
  // 明示指定の上書き（最優先）。例: EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:4001
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  // 起動モード。'local' のときは app.json の VPS 設定（extra.apiBaseUrl）を無視し、
  // Expo 開発サーバのホスト（= PC の LAN IP）自動判定にフォールバックする。
  const target = process.env.EXPO_PUBLIC_API_TARGET;
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  const explicit = target === 'local' ? undefined : extra?.apiBaseUrl;
  if (explicit && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(explicit)) {
    return explicit;
  }
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const host = String(hostUri).split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${API_PORT}`;
    }
  }
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}`;
  }
  return explicit ?? `http://localhost:${API_PORT}`;
}

export const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15000,
});

const TOKEN_KEY = 'homeasset.token';
const isWeb = Platform.OS === 'web';

async function persistToken(token: string) {
  if (isWeb) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function removeToken() {
  if (isWeb) {
    window.localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

async function readToken(): Promise<string | null> {
  if (isWeb) {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setStoredToken(token: string | null) {
  if (token) {
    await persistToken(token);
  } else {
    await removeToken();
  }
}

export async function getStoredToken(): Promise<string | null> {
  return readToken();
}

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401（トークン失効）時に AuthProvider 側でログアウト処理させるためのコールバック。
// useAuth → client の一方向 import を保つため、登録方式にしている。
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb;
}

const AUTH_PATHS = ['/api/auth/login', '/api/auth/register'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    // ログイン/登録失敗の401は資格情報エラーなのでログアウト対象外
    if (status === 401 && !AUTH_PATHS.some((p) => url.includes(p))) {
      await setStoredToken(null);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);
