import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';

// Feature Student Screens
import SplashScreen from './src/Screens/SplashScreen';
import HomeScreen from './src/Screens/HomeScreen';
import StudentProfileScreen from './src/Screens/StudentProfileScreen';
import AcademicProfileScreen from './src/Screens/AcademicProfileScreen';
import StudentCourses from './src/Screens/StudentCourses';
import CourseFilterScreen from './src/Screens/CourseFilterScreen';
import CourseDetailsScreen from './src/Screens/CourseDetailsScreen';
import CounsellorInquiryScreen from './src/Screens/CounsellorInquiryScreen';
import StudentCareerPathScreen from './src/Screens/StudentCareerPathScreen';

// Auth / Onboarding
import LoadingScreen from './src/Screens/Onboarding/LoadingScreen';
import Onboarding from './src/Screens/Onboarding/Onboarding';
import About from './src/Screens/Onboarding/About';
import PrivacyConsent from './src/Screens/Onboarding/PrivacyConsent';
import CourseDatabase from './src/Screens/Onboarding/CourseDatabase';
import JobMarket from './src/Screens/Onboarding/JobMarket';
import AptitudeInfo from './src/Screens/Onboarding/AptitudeInfo';
import SignUp from './src/Screens/Auth/SignUp';
import SignIn from './src/Screens/Auth/SignIn';
import ForgotPassword from './src/Screens/Pwd/ForgotPassword';
import ResetPassword from './src/Screens/Pwd/ResetPassword';
import AdminPortal from './src/Screens/Admin/AdminPortal';
import AdminCreateAccount from './src/Screens/Admin/AdminCreateAccount';

// Student area
import StudentHome from './src/Screens/Student/StudentHome';
import StudentCoursesDetail from './src/Screens/Student/StudentCoursesdetail';
import StudentNotifications from './src/Screens/Student/StudentNotifications';

// Admin area
import AdminOverview from './src/Screens/Admin/AdminOverview';
import AdminCourses from './src/Screens/Admin/AdminCourses';
import AdminZScores from './src/Screens/Admin/AdminZScores';
import AdminLogs from './src/Screens/Admin/AdminLogs';
import AdminSettings from './src/Screens/Admin/AdminSettings';
import AdminProfile from './src/Screens/Admin/AdminProfile';
import AdminNotifications from './src/Screens/Admin/AdminNotifications';
import AdminStatDetail from './src/Screens/Admin/AdminStatDetail';

// Parent area
import ParentPortal from './src/Screens/Parent/ParentPortal';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Loading" screenOptions={{ headerShown: false }}>
            {/* Onboarding + Auth */}
            <Stack.Screen name="Loading" component={LoadingScreen} />
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Onboarding" component={Onboarding} />
            <Stack.Screen name="About" component={About} />
            <Stack.Screen name="CourseDatabase" component={CourseDatabase} />
            <Stack.Screen name="JobMarket" component={JobMarket} />
            <Stack.Screen name="AptitudeInfo" component={AptitudeInfo} />
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

            {/* Student Feature Screens */}
            <Stack.Screen name="Main" component={HomeScreen} />
            <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
            <Stack.Screen name="AcademicProfile" component={AcademicProfileScreen} />
            <Stack.Screen name="StudentCourses" component={StudentCourses} />
            <Stack.Screen name="CourseFilter" component={CourseFilterScreen} />
            <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} />
            <Stack.Screen name="CounsellorInquiry" component={CounsellorInquiryScreen} />
            <Stack.Screen name="StudentCareerPath" component={StudentCareerPathScreen} />
            <Stack.Screen name="StudentHome" component={StudentHome} />
            <Stack.Screen name="StudentCoursesDetail" component={StudentCoursesDetail} />
            <Stack.Screen name="StudentNotifications" component={StudentNotifications} />

            {/* Admin Area */}
            <Stack.Screen name="AdminOverview" component={AdminOverview} />
            <Stack.Screen name="AdminCourses" component={AdminCourses} />
            <Stack.Screen name="AdminZScores" component={AdminZScores} />
            <Stack.Screen name="AdminLogs" component={AdminLogs} />
            <Stack.Screen name="AdminSettings" component={AdminSettings} />
            <Stack.Screen name="AdminProfile" component={AdminProfile} />
            <Stack.Screen name="AdminNotifications" component={AdminNotifications} />
            <Stack.Screen name="AdminStatDetail" component={AdminStatDetail} />

            {/* Parent Area */}
            <Stack.Screen name="ParentPortal" component={ParentPortal} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}