// @group Utilities : Metric display card with terminal-style label and value

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_FAMILY } from '../utils/theme';

interface MetricCardProps {
  icon: string;
  iconColor?: string;
  label: string;
  value: string;
  subValue?: string;
}

export default function MetricCard({
  iconColor = COLORS.primary,
  label,
  value,
  subValue,
}: MetricCardProps): React.JSX.Element {
  return (
    <View style={[styles.card, { borderTopColor: iconColor }]}>
      <Text style={styles.label}>// {label.toUpperCase()}</Text>
      <Text style={[styles.value, { color: iconColor }]}>{value}</Text>
      {subValue && <Text style={styles.subValue}>{subValue}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 2,
    alignItems: 'flex-start',
    gap: 4,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.mono,
  },
  subValue: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
  },
});
