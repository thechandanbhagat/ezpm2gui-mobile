// @group Navigation : Dashboard stack navigator — Dashboard → ProcessDetail → Cluster / LogFiles

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { DashboardStackParamList } from '../types';
import { COLORS } from '../utils/theme';
import DashboardScreen from '../screens/DashboardScreen';
import ProcessDetailScreen from '../screens/ProcessDetailScreen';
import ClusterScreen from '../screens/ClusterScreen';
import LogFilesScreen from '../screens/LogFilesScreen';

const Stack = createStackNavigator<DashboardStackParamList>();

export default function DashboardStackNavigator(): React.JSX.Element {
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
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProcessDetail"
        component={ProcessDetailScreen}
        options={({ route }) => ({ title: route.params.process.name })}
      />
      <Stack.Screen
        name="Cluster"
        component={ClusterScreen}
        options={({ route }) => ({
          title: 'Cluster Management',
          headerSubtitle: route.params.process.name,
        })}
      />
      <Stack.Screen
        name="LogFiles"
        component={LogFilesScreen}
        options={({ route }) => ({ title: `${route.params.processName} — Logs` })}
      />
    </Stack.Navigator>
  );
}
