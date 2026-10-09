import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'cg_token';

export const tokenStore = {
  async get() {
    try { return await AsyncStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  async set(token) {
    try { await AsyncStorage.setItem(TOKEN_KEY, token); } catch {}
  },
  async clear() {
    try { await AsyncStorage.removeItem(TOKEN_KEY); } catch {}
  },
};

// Thin fetch wrapper that attaches the bearer token and throws on non-2xx.
export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const requestPath = path.startsWith('/api/') ? path.slice(4) : path;
  try {
    res = await fetch(`${API_BASE_URL}${requestPath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (networkErr) {
    const message = networkErr.name === 'AbortError'
      ? 'The server took too long to respond. Check that the backend is running and reachable.'
      : 'Network error — is the backend running and reachable?';
    throw new ApiError(message, 0);
  } finally {
    clearTimeout(timeout);
  }

  let data = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = { message: text }; } }

  if (!res.ok) {
    throw new ApiError((data && data.message) || 'Request failed.', res.status, data);
  }
  return data;
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data || {};
  }
}
