// @group Navigation : Root stack navigator — handles app setup flow and main app

import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import type { RootStackParamList } from '../types';
import { getServerUrl, getAuthToken } from '../services/config';
import { checkAuthStatus } from '../services/api';
import { socketManager } from '../services/socket';
import { COLORS } from '../utils/theme';
import ServerSetupScreen from '../screens/ServerSetupScreen';
import AuthScreen from '../screens/AuthScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

// @group Configuration : Navigation theme aligned with dark palette
const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.textPrimary,
    border: COLORS.border,
    primary: COLORS.primary,
    notification: COLORS.error,
  },
};

// @group Navigation > State : Startup state resolution
type StartScreen = 'loading' | 'setup' | 'auth' | 'main';

export default function RootNavigator(): React.JSX.Element {
  const [startScreen, setStartScreen] = useState<StartScreen>('loading');

  useEffect(() => {
    resolveStartScreen();
  }, []);

  async function resolveStartScreen(): Promise<void> {
    try {
      const url = await getServerUrl();
      if (!url || url === 'http://localhost:3101') {
        // Check if we can reach default server, otherwise show setup
        try {
          const status = await checkAuthStatus();
          const token = await getAuthToken();
          if (status.passwordSet && !token) {
            setStartScreen('auth');
          } else {
            await socketManager.connect();
            setStartScreen('main');
          }
        } catch {
          setStartScreen('setup');
        }
        return;
      }

      try {
        const status = await checkAuthStatus();
        const token = await getAuthToken();
        if (status.passwordSet && !token) {
          setStartScreen('auth');
        } else {
          await socketManager.connect();
          setStartScreen('main');
        }
      } catch {
        setStartScreen('setup');
      }
    } catch {
      setStartScreen('setup');
    }
  }

  if (startScreen === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Always register all three screens so that replace/reset navigations from
  // any screen (e.g. ServerSetup → Auth, MoreMenu lock → Auth) are never
  // rejected because the target screen isn't mounted.
  // initialRouteName controls which screen appears first without removing others.
  const initialRoute: keyof RootStackParamList =
    startScreen === 'auth' ? 'Auth' : startScreen === 'setup' ? 'ServerSetup' : 'Main';

  return (
    <NavigationContainer theme={NavTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="ServerSetup" component={ServerSetupScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
