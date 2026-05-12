// @group BusinessLogic : Process card component for the dashboard process list

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from './Icon';
import type { PM2Process } from '../types';
import StatusBadge from './StatusBadge';
import { formatBytes, formatUptime } from '../utils';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_FAMILY } from '../utils/theme';

interface ProcessCardProps {
  process: PM2Process;
  onPress: () => void;
  onLongPress: () => void;
}

export default function ProcessCard({
  process,
  onPress,
  onLongPress,
}: ProcessCardProps): React.JSX.Element {
  const { pm2_env, monit } = process;
  const uptime = pm2_env.status === 'online' ? formatUptime(Date.now() - pm2_env.pm_uptime) : '--';

  const accentColor =
    pm2_env.status === 'online' ? COLORS.online :
    pm2_env.status === 'errored' ? COLORS.errored :
    COLORS.stopped;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: accentColor }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={styles.idTag}>[{String(process.pm_id).padStart(2, '0')}]</Text>
          <Text style={styles.name} numberOfLines={1}>{pm2_env.name.toUpperCase()}</Text>
        </View>
        <StatusBadge status={pm2_env.status} size="sm" />
      </View>

      {/* Metrics row */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>CPU</Text>
          <Text style={[styles.metricValue, { color: monit.cpu > 80 ? COLORS.error : monit.cpu > 50 ? COLORS.warning : COLORS.textPrimary }]}>
            {monit.cpu.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>MEM</Text>
          <Text style={styles.metricValue}>{formatBytes(monit.memory)}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>UP</Text>
          <Text style={styles.metricValue}>{uptime}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>RST</Text>
          <Text style={[styles.metricValue, { color: pm2_env.restart_time > 5 ? COLORS.warning : COLORS.textPrimary }]}>
            {pm2_env.restart_time}x
          </Text>
        </View>
      </View>

      {/* Footer: PID + mode + namespace */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>PID:{process.pid > 0 ? process.pid : '?'}</Text>
        <Text style={styles.footerSep}>·</Text>
        <Text style={styles.footerText}>
          {pm2_env.exec_mode === 'cluster_mode' ? 'CLUSTER' : 'FORK'}
        </Text>
        {pm2_env.namespace !== 'default' && (
          <>
            <Text style={styles.footerSep}>·</Text>
            <Text style={styles.nsText}>ns:{pm2_env.namespace}</Text>
          </>
        )}
        <Icon name="chevron-forward" size={12} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 2,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: SPACING.sm,
  },
  idTag: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  name: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textPrimary,
    flex: 1,
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: `${COLORS.primary}15`,
    padding: SPACING.sm,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: `${COLORS.primary}20`,
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 1,
  },
  metricValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  footerText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
  },
  footerSep: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    opacity: 0.4,
  },
  nsText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.cyan,
  },
});
