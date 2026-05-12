// @group Utilities : Status badge with terminal bracket-style indicator

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStatusColor, getStatusLabel, ProcessStatus } from '../utils';
import { FONT_SIZE, RADIUS, FONT_FAMILY } from '../utils/theme';

interface StatusBadgeProps {
  status: ProcessStatus;
  size?: 'sm' | 'md';
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps): React.JSX.Element {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  const isSmall = size === 'sm';
  const fs = isSmall ? FONT_SIZE.xs : FONT_SIZE.sm;

  return (
    <View style={[styles.container, { borderColor: hexToRgba(color, 0.31), backgroundColor: hexToRgba(color, 0.063) }]}>
      <Text style={[styles.bracket, { color: hexToRgba(color, 0.38), fontSize: fs }]}>{'['}</Text>
      <Text style={[styles.label, { color, fontSize: fs }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.bracket, { color: hexToRgba(color, 0.38), fontSize: fs }]}>{']'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: 1,
  },
  bracket: {
    fontFamily: FONT_FAMILY.mono,
    fontWeight: '700',
  },
  label: {
    fontFamily: FONT_FAMILY.mono,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: 1,
  },
  bracket: {
    fontFamily: FONT_FAMILY.mono,
    fontWeight: '700',
  },
  label: {
    fontFamily: FONT_FAMILY.mono,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
