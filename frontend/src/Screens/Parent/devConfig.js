import { NativeModules, Platform } from 'react-native';

// TEMPORARY until login is ready: the signed-in parent (seed user 4, Nimal Perera).
// When login exists, read the user/token from the auth session instead.
export const DEV_PARENT_ID = 4;

const API_PORT = 5000;

// The backend runs on the same PC as the Expo dev server, so reuse its host.
// Override with EXPO_PUBLIC_API_URL (e.g. http://192.168.1.10:5000) if needed.
function devServerHost() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hostname;
  }
  try {
    const sourceCode = NativeModules.SourceCode;
    const scriptURL = sourceCode?.getConstants?.().scriptURL ?? sourceCode?.scriptURL;
    const match = scriptURL && scriptURL.match(/^https?:\/\/([^:/]+)/);
    if (match) return match[1];
  } catch {
    // fall through to the defaults below
  }
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${devServerHost()}:${API_PORT}`;
