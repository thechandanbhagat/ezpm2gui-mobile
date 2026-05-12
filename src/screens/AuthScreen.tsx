// @group Authentication : Auth screen — password and PIN verification

import React, { useState, useEffect } from 'react';
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
import { setAuthToken } from '../services/config';
import { checkAuthStatus, verifyPassword, verifyPin } from '../services/api';
import { socketManager } from '../services/socket';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../utils/theme';

type Nav = StackNavigationProp<RootStackParamList, 'Auth'>;

type AuthMode = 'password' | 'pin';

// @group Authentication > Screens : Auth screen logic
export default function AuthScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const [mode, setMode] = useState<AuthMode>('password');
  const [hasPin, setHasPin] = useState(false);
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthStatus()
      .then((status) => {
        setHasPin(status.pinSet);
        if (status.pinSet && !status.passwordSet) setMode('pin');
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(): Promise<void> {
    setError('');
    setLoading(true);

    try {
      let res;
      if (mode === 'password') {
        if (!password.trim()) { setError('Password is required'); setLoading(false); return; }
        res = await verifyPassword(password);
      } else {
        if (pin.length !== 4) { setError('PIN must be 4 digits'); setLoading(false); return; }
        res = await verifyPin(pin);
      }

      if (res.success && res.token) {
        await setAuthToken(res.token);
        await socketManager.connect();
        navigation.replace('Main');
      } else {
        setError(res.message ?? 'Invalid credentials');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  // @group Authentication > PIN : PIN input digit renderer
  function renderPinDots(): React.JSX.Element {
    return (
      <View style={styles.pinDots}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.pinDot, { backgroundColor: i < pin.length ? COLORS.primary : COLORS.border }]}
          />
        ))}
      </View>
    );
  }

  function renderPinPad(): React.JSX.Element {
    const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    return (
      <View style={styles.pinPad}>
        {digits.map((d, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.pinKey, d === '' && styles.pinKeyEmpty]}
            disabled={d === ''}
            onPress={() => {
              setError('');
              if (d === '⌫') {
                setPin((p) => p.slice(0, -1));
              } else if (pin.length < 4) {
                const next = pin + d;
                setPin(next);
                if (next.length === 4) {
                  // auto-submit on 4 digits
                  setTimeout(() => handleSubmitPin(next), 100);
                }
              }
            }}
          >
            {d !== '' && (
              <Text style={styles.pinKeyText}>{d}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  async function handleSubmitPin(pinValue: string): Promise<void> {
    setError('');
    setLoading(true);
    try {
      const res = await verifyPin(pinValue);
      if (res.success && res.token) {
        await setAuthToken(res.token);
        await socketManager.connect();
        navigation.replace('Main');
      } else {
        setPin('');
        setError(res.message ?? 'Invalid PIN');
      }
    } catch (err) {
      setPin('');
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#0f172a']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Icon name="lock-closed-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Authentication Required</Text>
            <Text style={styles.subtitle}>
              This server requires authentication to access.
            </Text>
          </View>

          {/* Mode toggle */}
          {hasPin && (
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'password' && styles.modeBtnActive]}
                onPress={() => { setMode('password'); setError(''); }}
              >
                <Icon name="key-outline" size={16} color={mode === 'password' ? COLORS.primary : COLORS.textMuted} />
                <Text style={[styles.modeBtnText, mode === 'password' && styles.modeBtnTextActive]}>Password</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'pin' && styles.modeBtnActive]}
                onPress={() => { setMode('pin'); setError(''); }}
              >
                <Icon name="keypad-outline" size={16} color={mode === 'pin' ? COLORS.primary : COLORS.textMuted} />
                <Text style={[styles.modeBtnText, mode === 'pin' && styles.modeBtnTextActive]}>PIN</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.card}>
            {mode === 'password' ? (
              // @group Authentication > Password : Password input form
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setError(''); }}
                    placeholder="Enter server password"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                    <Icon
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              // @group Authentication > PIN : PIN pad form
              <View style={styles.pinContainer}>
                <Text style={styles.pinHint}>Enter your 4-digit PIN</Text>
                {renderPinDots()}
                {error ? <Text style={[styles.errorText, { textAlign: 'center' }]}>{error}</Text> : null}
                {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
                {renderPinPad()}
              </View>
            )}
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
  logoArea: { alignItems: 'center', gap: SPACING.sm },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}20`,
    borderWidth: 2,
    borderColor: `${COLORS.primary}40`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: 6,
  },
  modeBtnActive: { backgroundColor: `${COLORS.primary}20` },
  modeBtnText: { fontSize: FONT_SIZE.md, color: COLORS.textMuted, fontWeight: '600' },
  modeBtnTextActive: { color: COLORS.primary },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formGroup: { gap: SPACING.md },
  inputLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, height: 48, color: COLORS.textPrimary, fontSize: FONT_SIZE.md },
  errorText: { fontSize: FONT_SIZE.sm, color: COLORS.error },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: '#fff' },
  pinContainer: { alignItems: 'center', gap: SPACING.lg },
  pinHint: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  pinDots: { flexDirection: 'row', gap: SPACING.lg },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: RADIUS.full,
  },
  pinPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    gap: SPACING.md,
    justifyContent: 'center',
  },
  pinKey: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinKeyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  pinKeyText: { fontSize: FONT_SIZE.xxl, fontWeight: '600', color: COLORS.textPrimary },
});
