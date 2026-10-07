import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';

// Auth / onboarding
import LoadingScreen from './src/Screens/Onboarding/LoadingScreen';
import Onboarding from './src/Screens/Onboarding/Onboarding';
import About from './src/Screens/Onboarding/About';
import PrivacyConsent from './src/Screens/Onboarding/PrivacyConsent';
import SignUp from './src/Screens/Auth/SignUp';
import SignIn from './src/Screens/Auth/SignIn';
import ForgotPassword from './src/Screens/Pwd/ForgotPassword';
import ResetPassword from './src/Screens/Pwd/ResetPassword';
import AdminPortal from './src/Screens/Admin/AdminPortal';
import AdminCreateAccount from './src/Screens/Admin/AdminCreateAccount';

// Student area
import StudentHome from './src/Screens/Student/StudentHome';
import StudentQuiz from './src/Screens/Student/StudentQuiz';
import StudentCourses from './src/Screens/Student/StudentCourses';
import StudentProfile from './src/Screens/Student/StudentProfile';
import StudentNotifications from './src/Screens/Student/StudentNotifications';

// Admin area
import AdminOverview from './src/Screens/Admin/AdminOverview';
import AdminCourses from './src/Screens/Admin/AdminCourses';
import AdminZScores from './src/Screens/Admin/AdminZScores';
import AdminLogs from './src/Screens/Admin/AdminLogs';
import AdminSettings from './src/Screens/Admin/AdminSettings';
import AdminProfile from './src/Screens/Admin/AdminProfile';
import AdminNotifications from './src/Screens/Admin/AdminNotifications';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Loading" screenOptions={{ headerShown: false }}>
            {/* Onboarding + auth */}
            <Stack.Screen name="Loading" component={LoadingScreen} />
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
