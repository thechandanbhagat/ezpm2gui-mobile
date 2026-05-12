// @group Navigation > MoreMenu : More menu screen with navigation to sub-screens

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MoreStackParamList } from '../types';
import { clearAuthToken } from '../services/config';
import { socketManager } from '../services/socket';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../utils/theme';

type Nav = StackNavigationProp<MoreStackParamList, 'MoreMenu'>;

interface MenuItemProps {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function MenuItem({ icon, iconColor, title, subtitle, onPress }: MenuItemProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: `${iconColor}20` }]}>
        <Icon name={icon as any} size={22} color={iconColor} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Icon name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

export default function MoreMenuScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();

  // @group BusinessLogic > MoreMenu > Lock : Clear auth and return to lock screen
  function handleLock(): void {
    Alert.alert('Lock App', 'Lock the app and return to the login screen?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Lock',
        style: 'destructive',
        onPress: async () => {
          await clearAuthToken();
          socketManager.disconnect();
          navigation.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'Auth' as any }] })
          );
        },
      },
    ]);
  }

  const menuItems: MenuItemProps[] = [
    {
      icon: 'globe-outline',
      iconColor: COLORS.primary,
      title: 'Remote Connections',
      subtitle: 'Manage remote PM2 servers',
      onPress: () => navigation.navigate('Remote'),
    },
    {
      icon: 'rocket-outline',
      iconColor: COLORS.success,
      title: 'Deploy Application',
      subtitle: 'Deploy a new or updated app',
      onPress: () => navigation.navigate('Deploy'),
    },
    {
      icon: 'git-branch-outline',
      iconColor: '#a855f7',
      title: 'Metrics History',
      subtitle: 'Live system load and memory charts',
      onPress: () => navigation.navigate('MetricsHistory'),
    },
    {
      icon: 'cube-outline',
      iconColor: COLORS.warning,
      title: 'PM2 Modules',
      subtitle: 'Install and manage PM2 modules',
      onPress: () => navigation.navigate('Modules'),
    },
    {
      icon: 'settings-outline',
      iconColor: COLORS.textSecondary,
      title: 'Settings',
      subtitle: 'Server URL, theme, intervals',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {menuItems.map((item, idx) => (
            <React.Fragment key={item.title}>
              <MenuItem {...item} />
              {idx < menuItems.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity style={styles.lockBtn} onPress={handleLock} activeOpacity={0.8}>
          <Icon name="lock-closed-outline" size={18} color={COLORS.error} />
          <Text style={styles.lockBtnText}>Lock App</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.textPrimary },
  content: { padding: SPACING.lg, gap: SPACING.md },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: { flex: 1 },
  menuTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  menuSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.lg + 42 + SPACING.md },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.error}15`,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
    paddingVertical: SPACING.md,
  },
  lockBtnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.error },
});
