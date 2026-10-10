import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { api } from '../api/client';

// Google sign-in through the browser - works inside Expo Go (no native module needed).
// The backend runs the Google flow (see /api/auth/google/* in auth.controller.js) and
// sends the browser back to the app with a one-time code, which is swapped for a session.
//
// Resolves with { token, user }, or null if the user closed the Google page.
export async function signInWithGoogle(role) {
  const config = await api('/api/auth/google/config', { auth: false });
  if (!config?.enabled) {
    throw new Error('Google sign-in is not set up on the server yet (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and PUBLIC_URL in backend/.env).');
  }

  // Where Google should send the user back to: this app (exp://… in Expo Go).
  const returnTo = Linking.createURL('google-auth');
  const startUrl = `${config.startUrl}?role=${encodeURIComponent(role)}&returnTo=${encodeURIComponent(returnTo)}`;

  const result = await WebBrowser.openAuthSessionAsync(startUrl, returnTo);
  if (result.type !== 'success' || !result.url) return null; // closed or cancelled

  const { queryParams } = Linking.parse(result.url);
  if (queryParams?.error) throw new Error(String(queryParams.error));
  if (!queryParams?.code) throw new Error('Google sign-in did not complete. Please try again.');

  return api('/api/auth/google/exchange', { method: 'POST', auth: false, body: { code: queryParams.code } });
}
