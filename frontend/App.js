import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';

// Auth / onboarding
import SplashScreen from './src/Screens/SplashScreen';
import Onboarding from './src/Screens/Onboarding';
import About from './src/Screens/About';
import PrivacyConsent from './src/Screens/PrivacyConsent';
import SignUp from './src/Screens/SignUp';
import SignIn from './src/Screens/SignIn';
import ForgotPassword from './src/Screens/ForgotPassword';
import ResetPassword from './src/Screens/ResetPassword';
import AdminPortal from './src/Screens/AdminPortal';
import AdminCreateAccount from './src/Screens/AdminCreateAccount';

// Student area
import StudentHome from './src/Screens/StudentHome';
import StudentQuiz from './src/Screens/StudentQuiz';
import StudentCourses from './src/Screens/StudentCourses';
import StudentProfile from './src/Screens/StudentProfile';
import StudentNotifications from './src/Screens/StudentNotifications';

// Admin area
import AdminOverview from './src/Screens/AdminOverview';
import AdminCourses from './src/Screens/AdminCourses';
import AdminZScores from './src/Screens/AdminZScores';
import AdminLogs from './src/Screens/AdminLogs';
import AdminSettings from './src/Screens/AdminSettings';
import AdminProfile from './src/Screens/AdminProfile';
import AdminNotifications from './src/Screens/AdminNotifications';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
            {/* Onboarding + auth */}
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Onboarding" component={Onboarding} />
            <Stack.Screen name="About" component={About} />
            <Stack.Screen
              name="PrivacyConsent"
              component={PrivacyConsent}
              options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="SignUp" component={SignUp} />
            <Stack.Screen name="SignIn" component={SignIn} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
            <Stack.Screen name="ResetPassword" component={ResetPassword} />
            <Stack.Screen name="AdminPortal" component={AdminPortal} />
            <Stack.Screen name="AdminCreateAccount" component={AdminCreateAccount} />

            {/* Student */}
            <Stack.Screen name="StudentHome" component={StudentHome} />
            <Stack.Screen name="StudentQuiz" component={StudentQuiz} />
            <Stack.Screen name="StudentCourses" component={StudentCourses} />
            <Stack.Screen name="StudentProfile" component={StudentProfile} />
            <Stack.Screen name="StudentNotifications" component={StudentNotifications} />

            {/* Admin */}
            <Stack.Screen name="AdminOverview" component={AdminOverview} />
            <Stack.Screen name="AdminCourses" component={AdminCourses} />
            <Stack.Screen name="AdminZScores" component={AdminZScores} />
            <Stack.Screen name="AdminLogs" component={AdminLogs} />
            <Stack.Screen name="AdminSettings" component={AdminSettings} />
            <Stack.Screen name="AdminProfile" component={AdminProfile} />
            <Stack.Screen name="AdminNotifications" component={AdminNotifications} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
