import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Where the Express backend is reachable from the running app.
//  - Web (expo start --web):       localhost works.
//  - Android emulator:             10.0.2.2 maps to the host machine.
//  - iOS simulator:                localhost works.
//  - Physical device (Expo Go):    replace with your computer's LAN IP, e.g. http://192.168.1.5:3000
//
// Override any time by setting EXPO_PUBLIC_API_URL in the environment.
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const LAN_IP = expoHost ? `http://${expoHost}:3000` : 'http://192.168.1.104:3000';

const defaultByPlatform = Platform.select({
  android: LAN_IP,
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
});

// Server root without a trailing "/api" (callers add /api/... themselves).
export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL || defaultByPlatform || LAN_IP).replace(/\/+$/, '').replace(/\/api$/, '');

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
// Students land on the 4-tab home (route "Main").
const HOME_ROUTE = { admin: 'AdminOverview', parent: 'ParentPortal', student: 'Main', counsellor: 'CounsellorPortal' };
export const homeRouteFor = (role) => HOME_ROUTE[role] || 'Main';
