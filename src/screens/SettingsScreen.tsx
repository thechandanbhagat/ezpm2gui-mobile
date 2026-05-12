// @group Configuration > Settings : App settings screen — server URL, intervals, theme, about

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MoreStackParamList } from '../types';
import {
  getServerUrl,
  setServerUrl,
  getRefreshInterval,
  setRefreshInterval,
  getTheme,
  setTheme,
  clearAllConfig,
} from '../services/config';
import { socketManager } from '../services/socket';
import { testConnection } from '../services/api';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../utils/theme';
import { isValidUrl } from '../utils';

type Nav = StackNavigationProp<MoreStackParamList, 'Settings'>;

// @group Configuration > Settings > SettingRow : Individual setting row component
function SettingRow({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLabel}>
        <Text style={styles.settingLabelText}>{label}</Text>
        {sublabel && <Text style={styles.settingSubLabel}>{sublabel}</Text>}
      </View>
      <View style={styles.settingControl}>{children}</View>
    </View>
  );
}

export default function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const [serverUrl, setServerUrlState] = useState('');
  const [refreshInterval, setRefreshIntervalState] = useState(5);
  const [isDark, setIsDark] = useState(true);
  const [urlEditing, setUrlEditing] = useState(false);
  const [urlTesting, setUrlTesting] = useState(false);
  const [urlStatus, setUrlStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings(): Promise<void> {
    const [url, interval, theme] = await Promise.all([
      getServerUrl(),
      getRefreshInterval(),
      getTheme(),
    ]);
    setServerUrlState(url);
    setRefreshIntervalState(interval);
    setIsDark(theme === 'dark');
  }

  async function handleSaveUrl(): Promise<void> {
    let trimmed = serverUrl.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      trimmed = `http://${trimmed}`;
      setServerUrlState(trimmed);
    }
    if (!isValidUrl(trimmed)) {
      Alert.alert('Invalid URL', 'Please enter a valid http:// or https:// URL');
      return;
    }
    setUrlTesting(true);
    setUrlStatus('idle');
    const result = await testConnection(trimmed);
    setUrlTesting(false);
    if (!result.ok) {
      setUrlStatus('error');
      Alert.alert('Connection Failed', result.error ?? 'Could not reach server');
      return;
    }
    await setServerUrl(trimmed);
    setUrlStatus('ok');
    setUrlEditing(false);
    socketManager.disconnect();
    await socketManager.connect();
  }

  async function handleIntervalChange(val: number): Promise<void> {
    const clamped = Math.max(3, Math.min(60, val));
    setRefreshIntervalState(clamped);
    await setRefreshInterval(clamped);
  }

  async function handleThemeToggle(val: boolean): Promise<void> {
    setIsDark(val);
    await setTheme(val ? 'dark' : 'light');
  }

  async function handleReset(): Promise<void> {
    Alert.alert(
      'Reset Connection',
      'This will clear the server URL and authentication token. You will need to reconnect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            socketManager.disconnect();
            await clearAllConfig();
            navigation.dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: 'ServerSetup' as never }] })
            );
          },
        },
      ]
    );
  }

  const intervalOptions = [3, 5, 10, 15, 30, 60];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Server URL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <View style={styles.card}>
            <View style={styles.urlRow}>
              <View style={styles.urlInfo}>
                <Text style={styles.urlLabel}>Server URL</Text>
                {urlEditing ? (
                  <TextInput
                    style={styles.urlInput}
                    value={serverUrl}
                    onChangeText={setServerUrlState}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    autoFocus
                  />
                ) : (
                  <Text style={styles.urlValue}>{serverUrl}</Text>
                )}
              </View>
              {urlEditing ? (
                <View style={styles.urlBtns}>
                  <TouchableOpacity
                    style={styles.urlBtn}
                    onPress={handleSaveUrl}
                    disabled={urlTesting}
                  >
                    {urlTesting ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Icon name="checkmark-outline" size={20} color={urlStatus === 'ok' ? COLORS.success : COLORS.primary} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.urlBtn}
                    onPress={() => { setUrlEditing(false); loadSettings(); }}
                  >
                    <Icon name="close-outline" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.urlBtn} onPress={() => setUrlEditing(true)}>
                  <Icon name="pencil-outline" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {urlStatus === 'ok' && (
              <View style={styles.urlSuccessBanner}>
                <Icon name="checkmark-circle-outline" size={14} color={COLORS.success} />
                <Text style={styles.urlSuccessText}>Connected and saved</Text>
              </View>
            )}
          </View>
        </View>

        {/* Refresh Interval */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Refresh Interval</Text>
          <View style={styles.card}>
            <Text style={styles.intervalLabel}>
              Current: every <Text style={styles.intervalValue}>{refreshInterval}s</Text>
            </Text>
            <View style={styles.intervalOptions}>
              {intervalOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.intervalChip, refreshInterval === opt && styles.intervalChipActive]}
                  onPress={() => handleIntervalChange(opt)}
                >
                  <Text style={[styles.intervalChipText, refreshInterval === opt && styles.intervalChipTextActive]}>
                    {opt}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <SettingRow label="Dark Theme" sublabel="Use dark color scheme">
              <Switch
                value={isDark}
                onValueChange={handleThemeToggle}
                trackColor={{ false: COLORS.surface, true: COLORS.primaryDark }}
                thumbColor={isDark ? COLORS.primary : COLORS.textMuted}
              />
            </SettingRow>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>App</Text>
              <Text style={styles.aboutValue}>EZ PM2 GUI Mobile</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Version</Text>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Server</Text>
              <Text style={[styles.aboutValue, { fontFamily: 'monospace', fontSize: FONT_SIZE.xs }]}>
                {serverUrl}
              </Text>
            </View>
          </View>
        </View>

        {/* Reset */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Icon name="log-out-outline" size={18} color={COLORS.error} />
              <Text style={styles.resetBtnText}>Disconnect and Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  section: { gap: SPACING.sm },
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingLeft: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  urlInfo: { flex: 1, gap: 3 },
  urlLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  urlInput: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    height: 34,
  },
  urlValue: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontFamily: 'monospace' },
  urlBtns: { flexDirection: 'row', gap: 4 },
  urlBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urlSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  urlSuccessText: { fontSize: FONT_SIZE.xs, color: COLORS.success },
  intervalLabel: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, padding: SPACING.md, paddingBottom: SPACING.sm },
  intervalValue: { fontWeight: '700', color: COLORS.primary },
  intervalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    padding: SPACING.md,
    paddingTop: 0,
  },
  intervalChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  intervalChipActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}20` },
  intervalChipText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted },
  intervalChipTextActive: { color: COLORS.primary },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  settingLabel: { flex: 1, gap: 2 },
  settingLabelText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  settingSubLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  settingControl: {},
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  aboutLabel: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  aboutValue: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.md },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  resetBtnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.error },
});
