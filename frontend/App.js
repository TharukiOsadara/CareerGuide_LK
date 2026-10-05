import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from './src/Screens/SplashScreen';
import MainScreen from './src/Screens/MainScreen';
import Onboarding from './src/Screens/Onboarding';
import PrivacyConsent from './src/Screens/PrivacyConsent';
import SignUp from './src/Screens/SignUp';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding" component={Onboarding} />
          <Stack.Screen
            name="PrivacyConsent"
            component={PrivacyConsent}
            options={{
              presentation: 'transparentModal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen name="SignUp" component={SignUp} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}