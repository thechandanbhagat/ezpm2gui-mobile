// @group Utilities : Reusable section header with terminal comment style

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from './Icon';
import { COLORS, SPACING, FONT_SIZE, FONT_FAMILY } from '../utils/theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
}

export default function SectionHeader({
  title,
  actionLabel,
  actionIcon,
  onAction,
}: SectionHeaderProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.prefix}>//</Text>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.line} />
      {onAction && (
        <TouchableOpacity style={styles.action} onPress={onAction}>
          {actionIcon && <Icon name={actionIcon} size={13} color={COLORS.primary} />}
          {actionLabel && <Text style={styles.actionText}>{actionLabel.toUpperCase()}</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: 6,
  },
  prefix: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  title: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.primary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
