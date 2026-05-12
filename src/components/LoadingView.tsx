// @group Utilities : Reusable loading state display component

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../utils/theme';

interface LoadingViewProps {
  message?: string;
}

export default function LoadingView({ message }: LoadingViewProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: SPACING.md,
  },
  message: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
});
