import React from 'react';
import { StatusBar } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AccessHistory from './AccessHistory';
import InquiryHistory from './InquiryHistory';
import ParentTabs from './ParentTabs';
import { ToastProvider } from './components/Toast';
import { ChildProvider } from './context/ChildContext';
import { LeaveGuardProvider } from './context/LeaveGuardContext';
import { colors } from './theme';

const Stack = createNativeStackNavigator();

// Entry point of the Parent View module - register this one screen in App.js.
export default function ParentPortal() {
  return (
    <ToastProvider>
      <ChildProvider>
        <LeaveGuardProvider>
          <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ParentTabs" component={ParentTabs} />
            <Stack.Screen name="InquiryHistory" component={InquiryHistory} />
            <Stack.Screen name="AccessHistory" component={AccessHistory} />
          </Stack.Navigator>
        </LeaveGuardProvider>
      </ChildProvider>
    </ToastProvider>
  );
}
