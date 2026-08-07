import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SetupScreen from './src/screens/SetupScreen';
import InterviewScreen from './src/screens/InterviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Dark navigation theme matching our design system
const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4F8EF7',
    background: '#0B0F1A',
    card: '#141B2D',
    text: '#F1F5F9',
    border: 'rgba(255, 255, 255, 0.08)',
    notification: '#EF4444',
  },
};

export default function App() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F1A" />
      <Stack.Navigator
        initialRouteName="Setup"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#141B2D',
          },
          headerTintColor: '#F1F5F9',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
          },
          headerShadowVisible: false,
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: '#0B0F1A',
          },
        }}
      >
        <Stack.Screen
          name="Setup"
          component={SetupScreen}
          options={{
            title: 'Interview Copilot',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Interview"
          component={InterviewScreen}
          options={{
            title: 'Live Interview',
            headerBackTitle: 'End',
            // Prevent accidental back navigation during interview
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
