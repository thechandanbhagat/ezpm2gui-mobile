// @group BusinessLogic > Dashboard : Main dashboard screen with process list and system summary

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { DashboardStackParamList, PM2Process, ProcessAction } from '../types';
import { useProcesses } from '../hooks/useProcesses';
import { useMetrics } from '../hooks/useMetrics';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { processAction } from '../services/api';
import ProcessCard from '../components/ProcessCard';
import MetricCard from '../components/MetricCard';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import SectionHeader from '../components/SectionHeader';
import { formatBytes, formatSystemUptime } from '../utils';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_FAMILY } from '../utils/theme';

// @group Types > Dashboard : Sort mode enum
type SortMode = 'default' | 'cpu' | 'memory' | 'name' | 'status';

const SORT_MODES: { key: SortMode; label: string; icon: string }[] = [
  { key: 'default', label: 'Default', icon: 'list-outline' },
  { key: 'status', label: 'Status', icon: 'radio-button-on-outline' },
  { key: 'cpu', label: 'CPU ↓', icon: 'speedometer-outline' },
  { key: 'memory', label: 'Mem ↓', icon: 'hardware-chip-outline' },
  { key: 'name', label: 'Name', icon: 'text-outline' },
];

// @group Utilities > Dashboard : Sort process list by mode
function sortProcesses(processes: PM2Process[], mode: SortMode): PM2Process[] {
  switch (mode) {
    case 'cpu':
      return [...processes].sort((a, b) => b.monit.cpu - a.monit.cpu);
    case 'memory':
      return [...processes].sort((a, b) => b.monit.memory - a.monit.memory);
    case 'name':
      return [...processes].sort((a, b) => a.name.localeCompare(b.name));
    case 'status': {
      const order = ['online', 'launching', 'stopping', 'stopped', 'errored'];
      return [...processes].sort(
        (a, b) => order.indexOf(a.pm2_env.status) - order.indexOf(b.pm2_env.status)
      );
    }
    default:
      return processes;
  }
}

type Nav = StackNavigationProp<DashboardStackParamList, 'Dashboard'>;

// @group BusinessLogic > Dashboard > ActionSheet : Process action selection
function showProcessActions(
  process: PM2Process,
  onAction: (action: ProcessAction) => void
): void {
  const status = process.pm2_env.status;
  const options: string[] = [];
  const actions: ProcessAction[] = [];

  if (status !== 'online') { options.push('Start'); actions.push('start'); }
  if (status === 'online') { options.push('Stop'); actions.push('stop'); }
  options.push('Restart'); actions.push('restart');
  options.push('Delete'); actions.push('delete');
  options.push('Cancel');

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: process.name,
        options: [...options],
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: options.indexOf('Delete'),
      },
      (idx) => {
        if (idx < actions.length) onAction(actions[idx]);
      }
    );
  } else {
    Alert.alert(
      process.name,
      'Choose an action',
      [
        ...actions.map((action, i) => ({
          text: options[i],
          style: action === 'delete' ? ('destructive' as const) : ('default' as const),
          onPress: () => onAction(action),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }
}

export default function DashboardScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const { processes, loading, error, refresh } = useProcesses();
  const { metrics } = useMetrics();
  const { isConnected } = useConnectionStatus();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? processes.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.pm2_env.namespace.toLowerCase().includes(q) ||
            String(p.pm_id).includes(q)
        )
      : processes;
    return sortProcesses(base, sortMode);
  }, [processes, search, sortMode]);

  // @group BusinessLogic > Dashboard > Sort : Cycle or show sort picker
  function handleSortPress(): void {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Sort Processes',
          options: [...SORT_MODES.map((m) => m.label), 'Cancel'],
          cancelButtonIndex: SORT_MODES.length,
        },
        (idx) => {
          if (idx < SORT_MODES.length) setSortMode(SORT_MODES[idx].key);
        }
      );
    } else {
      Alert.alert(
        'Sort Processes',
        undefined,
        [
          ...SORT_MODES.map((m) => ({
            text: m.label + (sortMode === m.key ? ' ✓' : ''),
            onPress: () => setSortMode(m.key),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ]
      );
    }
  }

  const summary = useMemo(() => ({
    online: processes.filter((p) => p.pm2_env.status === 'online').length,
    stopped: processes.filter((p) => p.pm2_env.status === 'stopped').length,
    errored: processes.filter((p) => p.pm2_env.status === 'errored').length,
  }), [processes]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  async function handleAction(process: PM2Process, action: ProcessAction): Promise<void> {
    try {
      await processAction(process.pm_id, action);
      await refresh();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Action failed');
    }
  }

  if (loading && processes.length === 0) return <LoadingView message="Loading processes..." />;
  if (error && processes.length === 0) return <ErrorView message={error} onRetry={refresh} />;

  const memPercent = metrics
    ? ((metrics.memory.used / metrics.memory.total) * 100).toFixed(0)
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{'>'}_  PM2.CONSOLE</Text>
          <View style={styles.headerSubRow}>
            <Text style={[styles.connIndicator, { color: isConnected ? COLORS.success : COLORS.error }]}>
              {isConnected ? '■' : '□'}
            </Text>
            <Text style={styles.headerSub}>
              {isConnected ? `LIVE :: ${processes.length} PROCS` : 'RECONNECTING...'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleSortPress}>
            <Icon
              name={SORT_MODES.find((m) => m.key === sortMode)?.icon ?? 'list-outline'}
              size={17}
              color={sortMode !== 'default' ? COLORS.primary : COLORS.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={refresh}>
            <Icon name="refresh-outline" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.pm_id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            {/* System metrics row */}
            {metrics && (
              <>
                <SectionHeader title="System" />
                <View style={styles.metricsRow}>
                  <MetricCard
                    icon="speedometer-outline"
                    iconColor={COLORS.primary}
                    label="Load (1m)"
                    value={metrics.loadAvg[0].toFixed(2)}
                    subValue={`5m: ${metrics.loadAvg[1].toFixed(2)}`}
                  />
                  <MetricCard
                    icon="hardware-chip-outline"
                    iconColor={COLORS.warning}
                    label="Memory"
                    value={`${memPercent}%`}
                    subValue={`${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}`}
                  />
                  <MetricCard
                    icon="time-outline"
                    iconColor={COLORS.success}
                    label="Uptime"
                    value={formatSystemUptime(metrics.uptime)}
                  />
                </View>
              </>
            )}

            {/* Process summary */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryChip, { borderColor: `${COLORS.success}40` }]}>
                <View style={[styles.summaryDot, { backgroundColor: COLORS.success }]} />
                <Text style={[styles.summaryCount, { color: COLORS.success }]}>{summary.online}</Text>
                <Text style={styles.summaryLabel}>Online</Text>
              </View>
              <View style={[styles.summaryChip, { borderColor: `${COLORS.textMuted}40` }]}>
                <View style={[styles.summaryDot, { backgroundColor: COLORS.textMuted }]} />
                <Text style={[styles.summaryCount, { color: COLORS.textSecondary }]}>{summary.stopped}</Text>
                <Text style={styles.summaryLabel}>Stopped</Text>
              </View>
              <View style={[styles.summaryChip, { borderColor: `${COLORS.error}40` }]}>
                <View style={[styles.summaryDot, { backgroundColor: COLORS.error }]} />
                <Text style={[styles.summaryCount, { color: COLORS.error }]}>{summary.errored}</Text>
                <Text style={styles.summaryLabel}>Errored</Text>
              </View>
            </View>

            {/* Search bar */}
            <View style={styles.searchBar}>
              <Text style={styles.searchPrompt}>{'>'}</Text>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="FILTER_PROCS..."
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="close-circle" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.processesHeader}>
              <Text style={styles.processesSectionTitle}>
                Processes ({filtered.length})
              </Text>
              {sortMode !== 'default' && (
                <TouchableOpacity style={styles.sortIndicator} onPress={() => setSortMode('default')}>
                  <Text style={styles.sortIndicatorText}>
                    {SORT_MODES.find((m) => m.key === sortMode)?.label}
                  </Text>
                  <Icon name="close-circle" size={13} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Icon name="cube-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No processes found</Text>
            <Text style={styles.emptyDesc}>
              {search ? 'Try a different search term' : 'No PM2 processes are running'}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ProcessCard
            process={item}
            onPress={() => navigation.navigate('ProcessDetail', { process: item })}
            onLongPress={() =>
              showProcessActions(item, (action) => handleAction(item, action))
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#000000',
  },
  headerLeft: { gap: 3 },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connIndicator: { fontSize: 8, fontWeight: '700' },
  headerSub: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  headerActions: { flexDirection: 'row', gap: SPACING.sm },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  listHeader: { gap: SPACING.md, marginBottom: SPACING.md },
  metricsRow: { flexDirection: 'row', gap: SPACING.sm },
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  summaryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  summaryDot: { width: 6, height: 6, borderRadius: 1 },
  summaryCount: { fontSize: FONT_SIZE.md, fontWeight: '800', fontFamily: FONT_FAMILY.mono },
  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  processesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  processesSectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sortIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  sortIndicatorText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  searchPrompt: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textSecondary,
  },
  emptyDesc: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
