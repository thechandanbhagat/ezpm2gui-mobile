// @group Navigation : Root stack navigator — handles app setup flow and main app

import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import type { RootStackParamList } from '../types';
import { getAuthToken, clearAuthToken } from '../services/config';
import { checkAuthStatus, validateAuthToken } from '../services/api';
import { socketManager } from '../services/socket';
import { navigationRef } from './navigationRef';
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
      try {
        const status = await checkAuthStatus();
        const token = await getAuthToken();

        if (status.passwordSet) {
          if (!token) {
            setStartScreen('auth');
            return;
          }
          // A token exists — verify it is still valid before trusting it.
          // Revoked/expired tokens otherwise drop the user into a broken main
          // screen where every request 401s.
          const valid = await validateAuthToken();
          if (!valid) {
            await clearAuthToken();
            setStartScreen('auth');
            return;
          }
        }

        await socketManager.connect();
        setStartScreen('main');
      } catch {
        // Could not reach the configured server: send the user to setup.
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
    <NavigationContainer ref={navigationRef} theme={NavTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="ServerSetup" component={ServerSetupScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
