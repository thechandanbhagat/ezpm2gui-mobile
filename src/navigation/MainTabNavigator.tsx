// @group Navigation : Main bottom tab navigator

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon } from '../components/Icon';
import type { MainTabParamList } from '../types';
import { COLORS, FONT_FAMILY } from '../utils/theme';
import DashboardStackNavigator from './DashboardStackNavigator';
import MetricsScreen from '../screens/MetricsScreen';
import LogsScreen from '../screens/LogsScreen';
import CronJobsScreen from '../screens/CronJobsScreen';
import MoreStackNavigator from './MoreStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

// @group Navigation > Icons : Tab bar icon resolver
function getTabIcon(routeName: string, focused: boolean, color: string): React.ReactNode {
  const size = 20;
  const iconMap: Record<string, { focused: string; unfocused: string }> = {
    DashboardTab: { focused: 'home', unfocused: 'home-outline' },
    MetricsTab: { focused: 'stats-chart', unfocused: 'stats-chart-outline' },
    LogsTab: { focused: 'terminal', unfocused: 'terminal-outline' },
    CronTab: { focused: 'time', unfocused: 'time-outline' },
    MoreTab: { focused: 'menu', unfocused: 'menu-outline' },
  };
  const icons = iconMap[routeName] ?? { focused: 'ellipsis-horizontal', unfocused: 'ellipsis-horizontal-outline' };
  const name = focused ? icons.focused : icons.unfocused;
  return <Icon name={name} size={size} color={color} />;
}

export default function MainTabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          fontFamily: FONT_FAMILY.mono,
          letterSpacing: 1,
        },
        tabBarIcon: ({ focused, color }) => getTabIcon(route.name, focused, color),
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardStackNavigator} options={{ tabBarLabel: 'PROCS' }} />
      <Tab.Screen name="MetricsTab" component={MetricsScreen} options={{ tabBarLabel: 'SYS' }} />
      <Tab.Screen name="LogsTab" component={LogsScreen} options={{ tabBarLabel: 'LOGS' }} />
      <Tab.Screen name="CronTab" component={CronJobsScreen} options={{ tabBarLabel: 'CRON' }} />
      <Tab.Screen name="MoreTab" component={MoreStackNavigator} options={{ tabBarLabel: 'MORE' }} />
    </Tab.Navigator>
  );
}
