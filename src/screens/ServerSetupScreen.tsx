// @group APIEndpoints > ServerSetup : Server URL configuration and connection test screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Icon } from '../components/Icon';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import type { RootStackParamList } from '../types';
import { setServerUrl } from '../services/config';
import { testConnection, checkAuthStatus } from '../services/api';
import { socketManager } from '../services/socket';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../utils/theme';
import { isValidUrl } from '../utils';

type Nav = StackNavigationProp<RootStackParamList, 'ServerSetup'>;

// @group BusinessLogic > ServerSetup : Connection test and navigation logic
export default function ServerSetupScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const [url, setUrl] = useState('http://192.168.1.100:3101');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleConnect(): Promise<void> {
    let trimmed = url.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      trimmed = `http://${trimmed}`;
      setUrl(trimmed);
    }
    if (!isValidUrl(trimmed)) {
      setStatus('error');
      setErrorMsg('Please enter a valid URL (e.g. http://192.168.1.100:3101)');
      return;
    }

    setTesting(true);
    setStatus('idle');
    setErrorMsg('');

    const result = await testConnection(trimmed);
    if (!result.ok) {
      setTesting(false);
      setStatus('error');
      setErrorMsg(result.error ?? 'Could not connect to server');
      return;
    }

    await setServerUrl(trimmed);

    try {
      const authStatus = await checkAuthStatus();
      await socketManager.connect();
      setStatus('success');
      setTesting(false);

      setTimeout(() => {
        if (authStatus.passwordSet) {
          navigation.replace('Auth');
        } else {
          navigation.replace('Main');
        }
      }, 600);
    } catch {
      setTesting(false);
      setStatus('error');
      setErrorMsg('Connected but failed to read server status');
    }
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#0f172a']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Icon name="server-outline" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.appName}>EZ PM2 GUI</Text>
            <Text style={styles.tagline}>Mobile Dashboard</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connect to Server</Text>
            <Text style={styles.cardDesc}>
              Enter the URL of your EZ PM2 GUI backend server.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Server URL</Text>
              <View style={[
                styles.inputWrapper,
                status === 'error' && styles.inputError,
                status === 'success' && styles.inputSuccess,
              ]}>
                <Icon name="link-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={url}
                  onChangeText={(t) => { setUrl(t); setStatus('idle'); }}
                  placeholder="http://192.168.1.100:3101"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={handleConnect}
                />
                {status === 'success' && (
                  <Icon name="checkmark-circle" size={18} color={COLORS.success} />
                )}
                {status === 'error' && (
                  <Icon name="close-circle" size={18} color={COLORS.error} />
                )}
              </View>
              {status === 'error' && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.connectBtn, testing && styles.connectBtnDisabled]}
              onPress={handleConnect}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="wifi-outline" size={18} color="#fff" />
                  <Text style={styles.connectBtnText}>Connect</Text>
                </>
              )}
            </TouchableOpacity>

            {status === 'success' && (
              <View style={styles.successBanner}>
                <Icon name="checkmark-circle-outline" size={16} color={COLORS.success} />
                <Text style={styles.successText}>Connected! Redirecting...</Text>
              </View>
            )}
          </View>

          {/* Help text */}
          <View style={styles.helpArea}>
            <Icon name="information-circle-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.helpText}>
              Make sure your device is on the same network as the server.
              Default port is 3101.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.xl,
  },
  logoArea: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}20`,
    borderWidth: 2,
    borderColor: `${COLORS.primary}40`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.lg,
  },
  cardTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginTop: -SPACING.sm,
  },
  inputGroup: { gap: SPACING.sm },
  inputLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  inputError: { borderColor: COLORS.error },
  inputSuccess: { borderColor: COLORS.success },
  inputIcon: { marginRight: SPACING.sm },
  input: {
    flex: 1,
    height: 48,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
  },
  errorBox: {
    backgroundColor: `${COLORS.error}12`,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: `${COLORS.error}40`,
    padding: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.error,
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  connectBtnDisabled: { opacity: 0.6 },
  connectBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: '#fff',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.success}15`,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.success}30`,
  },
  successText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.success,
    fontWeight: '600',
  },
  helpArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  helpText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    lineHeight: 19,
  },
});
