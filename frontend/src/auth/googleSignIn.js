import { GOOGLE_WEB_CLIENT_ID } from '../config';

// Native Google Sign-In. The native module only exists in a development/production build
// (`npx expo run:android` or an EAS build) - it is NOT available inside Expo Go - so it is
// loaded lazily and every failure is turned into a readable message.
let lib = null;
let configured = false;

function loadLib() {
  if (lib) return lib;
  try {
    // eslint-disable-next-line global-require
    lib = require('@react-native-google-signin/google-signin');
  } catch {
    lib = null;
  }
  return lib;
}

export class GoogleSignInError extends Error {}

// Opens the Google account picker and resolves with an ID token, or null if the user cancelled.
export async function getGoogleIdToken() {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new GoogleSignInError(
      'Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in frontend/.env.'
    );
  }
  const g = loadLib();
  if (!g) {
    throw new GoogleSignInError(
      'Google sign-in needs the CareerGuide app build (npx expo run:android); it does not work inside Expo Go.'
    );
  }
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = g;

  if (!configured) {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, offlineAccess: false });
    configured = true;
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always show the account picker instead of silently reusing the last account.
    try { await GoogleSignin.signOut(); } catch {}
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null; // user closed the picker
    const idToken = response.data?.idToken;
    if (!idToken) throw new GoogleSignInError('Google did not return an ID token. Check the Web client ID.');
    return idToken;
  } catch (err) {
    if (err instanceof GoogleSignInError) throw err;
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.IN_PROGRESS) return null;
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleSignInError('Google Play Services is not available on this device.');
      }
      if (String(err.code) === '10' || /DEVELOPER_ERROR/i.test(err.message || '')) {
        throw new GoogleSignInError(
          'Google rejected this app (DEVELOPER_ERROR). Check the Android OAuth client: package com.careerguide.lk and its SHA-1.'
        );
      }
    }
    throw new GoogleSignInError(err?.message || 'Google sign-in failed.');
  }
}

// Clears the cached Google account on sign-out (no-op when the module is unavailable).
export async function googleSignOut() {
  const g = loadLib();
  if (!g || !configured) return;
  try { await g.GoogleSignin.signOut(); } catch {}
}
