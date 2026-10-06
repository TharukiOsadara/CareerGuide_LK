import { Platform } from 'react-native';

// Where the Express backend is reachable from the running app.
//  - Web (expo start --web):       localhost works.
//  - Android emulator:             10.0.2.2 maps to the host machine.
//  - iOS simulator:                localhost works.
//  - Physical device (Expo Go):    replace with your computer's LAN IP, e.g. http://192.168.1.5:5000
//
// Override any time by setting EXPO_PUBLIC_API_URL in the environment.
const LAN_IP = 'http://192.168.1.5:5000'; // <-- edit to your PC's IP when testing on a real phone

const defaultByPlatform = Platform.select({
  android: 'http://10.0.2.2:5000',
  ios: 'http://localhost:5000',
  default: 'http://localhost:5000',
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
