// @group Configuration > Theme : Application theme constants and React Native Paper theme

import { Platform } from 'react-native';
import { MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// @group Constants : Design token constants — Matrix/hacker terminal palette
export const COLORS = {
  background: '#000000',
  surface: '#080d08',
  surfaceVariant: '#0d180d',
  border: '#1a2e1a',
  primary: '#00ff41',
  primaryDark: '#00cc33',
  success: '#00ff41',
  warning: '#ffb300',
  error: '#ff003c',
  textPrimary: '#00ff41',
  textSecondary: '#00b830',
  textMuted: '#005518',
  online: '#00ff41',
  stopped: '#3a4a3a',
  errored: '#ff003c',
  launching: '#00d4ff',
  stopping: '#ffb300',
  overlay: 'rgba(0,15,0,0.92)',
  cyan: '#00d4ff',
} as const;

export const FONT_FAMILY = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6,
  full: 9999,
} as const;

export const FONT_SIZE = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
} as const;

// @group Configuration > Theme : React Native Paper custom dark theme
export const AppTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    surface: COLORS.surface,
    surfaceVariant: COLORS.surfaceVariant,
    onBackground: COLORS.textPrimary,
    onSurface: COLORS.textPrimary,
    onSurfaceVariant: COLORS.textSecondary,
    outline: COLORS.border,
    error: COLORS.error,
  },
};
