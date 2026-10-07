import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './src/Screens/SplashScreen';
import HomeScreen from './src/Screens/HomeScreen';
import StudentProfileScreen from './src/Screens/StudentProfileScreen';
import AcademicProfileScreen from './src/Screens/AcademicProfileScreen';
import StudentCourses from './src/Screens/StudentCourses';
import CourseFilterScreen from './src/Screens/CourseFilterScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={HomeScreen} />
        <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
        <Stack.Screen name="AcademicProfile" component={AcademicProfileScreen} />
        <Stack.Screen name="StudentCourses" component={StudentCourses} />
        <Stack.Screen name="CourseFilter" component={CourseFilterScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}