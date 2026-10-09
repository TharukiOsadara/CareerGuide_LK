import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Where the Express backend is reachable from the running app.
//  - Web (expo start --web):       localhost works.
//  - Android emulator:             10.0.2.2 maps to the host machine.
//  - iOS simulator:                localhost works.
//  - Physical device (Expo Go):    replace with your computer's LAN IP, e.g. http://192.168.1.5:5000
//
// Override any time by setting EXPO_PUBLIC_API_URL in the environment.
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const LAN_IP = expoHost ? `http://${expoHost}:3000` : 'http://192.168.1.104:3000';

const defaultByPlatform = Platform.select({
  android: LAN_IP,
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
});

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || defaultByPlatform || LAN_IP;

export const AL_STREAMS = [
  'Physical Science (Maths)',
  'Biological Science',
  'Commerce',
  'Arts',
  'Technology',
  'Engineering Technology',
  'Bio Systems Technology',
];

export const ROLES = ['student', 'parent', 'counsellor'];
export const ROLES_WITH_ADMIN = ['student', 'parent', 'counsellor', 'admin'];

// Dashboard each role lands on after signing in.
const HOME_ROUTE = { admin: 'AdminOverview', parent: 'ParentPortal', student: 'StudentHome', counsellor: 'CounsellorPortal' };
export const homeRouteFor = (role) => HOME_ROUTE[role] || 'StudentHome';

// Google Sign-In: the OAuth "Web application" client ID from Google Cloud Console.
// The backend's GOOGLE_CLIENT_ID must contain this same ID.
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
