// @group Navigation : More stack navigator — sub-screens accessible from More tab

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { MoreStackParamList } from '../types';
import { COLORS } from '../utils/theme';
import MoreMenuScreen from '../screens/MoreMenuScreen';
import RemoteScreen from '../screens/RemoteScreen';
import DeployScreen from '../screens/DeployScreen';
import ModulesScreen from '../screens/ModulesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MetricsHistoryScreen from '../screens/MetricsHistoryScreen';

const Stack = createStackNavigator<MoreStackParamList>();

export default function MoreStackNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitleVisible: false,
        cardStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen
        name="MoreMenu"
        component={MoreMenuScreen}
        options={{ title: 'More' }}
      />
      <Stack.Screen name="Remote" component={RemoteScreen} options={{ title: 'Remote Connections' }} />
      <Stack.Screen name="Deploy" component={DeployScreen} options={{ title: 'Deploy Application' }} />
      <Stack.Screen name="Modules" component={ModulesScreen} options={{ title: 'PM2 Modules' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="MetricsHistory" component={MetricsHistoryScreen} options={{ title: 'Metrics History' }} />
    </Stack.Navigator>
  );
}
