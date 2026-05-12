// @group BusinessLogic > ProcessDetail : Detailed process view with Logs, Metrics, and Config tabs

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { DashboardStackParamList, ProcessAction } from '../types';
import { useLogs } from '../hooks/useLogs';
import { useMetricsHistory } from '../hooks/useMetrics';
import { processAction } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { formatBytes, formatUptime, stripAnsi } from '../utils';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../utils/theme';

type Nav = StackNavigationProp<DashboardStackParamList, 'ProcessDetail'>;
type Route = RouteProp<DashboardStackParamList, 'ProcessDetail'>;

type DetailTab = 'logs' | 'metrics' | 'cluster' | 'config';

const SCREEN_WIDTH = Dimensions.get('window').width;

// @group BusinessLogic > ProcessDetail > ActionBar : Action button bar component
function ActionBar({
  status,
  onAction,
  loading,
}: {
  status: string;
  onAction: (a: ProcessAction) => void;
  loading: boolean;
}): React.JSX.Element {
  const isOnline = status === 'online';
  return (
    <View style={styles.actionBar}>
      {!isOnline && (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${COLORS.success}20`, borderColor: `${COLORS.success}40` }]} onPress={() => onAction('start')} disabled={loading}>
          <Icon name="play-outline" size={16} color={COLORS.success} />
          <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Start</Text>
        </TouchableOpacity>
      )}
      {isOnline && (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${COLORS.warning}20`, borderColor: `${COLORS.warning}40` }]} onPress={() => onAction('stop')} disabled={loading}>
          <Icon name="stop-outline" size={16} color={COLORS.warning} />
          <Text style={[styles.actionBtnText, { color: COLORS.warning }]}>Stop</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${COLORS.primary}20`, borderColor: `${COLORS.primary}40` }]} onPress={() => onAction('restart')} disabled={loading}>
        <Icon name="refresh-outline" size={16} color={COLORS.primary} />
        <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Restart</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${COLORS.error}20`, borderColor: `${COLORS.error}40` }]} onPress={() => onAction('delete')} disabled={loading}>
        <Icon name="trash-outline" size={16} color={COLORS.error} />
        <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Delete</Text>
      </TouchableOpacity>
      {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
    </View>
  );
}

// @group BusinessLogic > ProcessDetail > LogsTab : Real-time log viewer
function LogsTab({ processId }: { processId: number }): React.JSX.Element {
  const [logType, setLogType] = useState<'out' | 'err'>('out');
  const [liveEnabled, setLiveEnabled] = useState(true);
  const { lines, loading, error, clear, loadInitial } = useLogs(processId, logType, liveEnabled);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (liveEnabled && lines.length > 0) {
      flatRef.current?.scrollToEnd({ animated: false });
    }
  }, [lines, liveEnabled]);

  async function copyLogs(): Promise<void> {
    await Clipboard.setStringAsync(lines.join('\n'));
    Alert.alert('Copied', 'Logs copied to clipboard');
  }

  return (
    <View style={styles.tabContent}>
      {/* Controls */}
      <View style={styles.logControls}>
        <View style={styles.logTypeToggle}>
          {(['out', 'err'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.logTypeBtn, logType === t && styles.logTypeBtnActive]}
              onPress={() => setLogType(t)}
            >
              <Text style={[styles.logTypeBtnText, logType === t && styles.logTypeBtnTextActive]}>
                {t === 'out' ? 'stdout' : 'stderr'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.logActions}>
          <TouchableOpacity
            style={[styles.logActionBtn, liveEnabled && styles.logActionBtnActive]}
            onPress={() => setLiveEnabled((v) => !v)}
          >
            <Icon name={liveEnabled ? 'radio-button-on' : 'radio-button-off'} size={14} color={liveEnabled ? COLORS.success : COLORS.textMuted} />
            <Text style={[styles.logActionBtnText, { color: liveEnabled ? COLORS.success : COLORS.textMuted }]}>Live</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logActionBtn} onPress={loadInitial}>
            <Icon name="refresh-outline" size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logActionBtn} onPress={clear}>
            <Icon name="trash-outline" size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logActionBtn} onPress={copyLogs}>
            <Icon name="copy-outline" size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && lines.length === 0 ? (
        <View style={styles.logLoadingState}><ActivityIndicator color={COLORS.primary} /></View>
      ) : error ? (
        <Text style={styles.logError}>{error}</Text>
      ) : (
        <FlatList
          ref={flatRef}
          data={lines}
          keyExtractor={(_, i) => String(i)}
          style={styles.logList}
          contentContainerStyle={styles.logListContent}
          renderItem={({ item }) => (
            <Text style={styles.logLine}>{stripAnsi(item)}</Text>
          )}
          ListEmptyComponent={<Text style={styles.logEmpty}>No log output</Text>}
        />
      )}
    </View>
  );
}

// @group BusinessLogic > ProcessDetail > MetricsTab : CPU and memory history charts
function MetricsTab({ processId }: { processId: number }): React.JSX.Element {
  const { history, loading, error } = useMetricsHistory(processId);

  if (loading) return <View style={styles.tabContent}><ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /></View>;
  if (error) return <View style={styles.tabContent}><Text style={styles.logError}>{error}</Text></View>;
  if (history.length === 0) return <View style={styles.tabContent}><Text style={styles.logEmpty}>No metrics history available</Text></View>;

  const recent = history.slice(-20);
  const cpuData = recent.map((h) => h.cpu ?? 0);
  const memData = recent.map((h) => (h.memory ?? 0) / 1024 / 1024);
  const labels = recent.map((_, i) => (i % 5 === 0 ? String(i) : ''));

  const chartConfig = {
    backgroundColor: COLORS.background,
    backgroundGradientFrom: COLORS.background,
    backgroundGradientTo: COLORS.background,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: () => COLORS.textMuted,
    style: { borderRadius: RADIUS.md },
    propsForDots: { r: '2', strokeWidth: '1', stroke: COLORS.primary },
  };

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: SPACING.md, gap: SPACING.lg }}>
      <View>
        <Text style={styles.chartTitle}>CPU Usage (%)</Text>
        <LineChart
          data={{ labels, datasets: [{ data: cpuData.length > 0 ? cpuData : [0] }] }}
          width={SCREEN_WIDTH - SPACING.lg * 2}
          height={160}
          chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(34, 197, 94, ${o})` }}
          bezier
          style={{ borderRadius: RADIUS.md }}
          withDots={false}
        />
      </View>
      <View>
        <Text style={styles.chartTitle}>Memory Usage (MB)</Text>
        <LineChart
          data={{ labels, datasets: [{ data: memData.length > 0 ? memData : [0] }] }}
          width={SCREEN_WIDTH - SPACING.lg * 2}
          height={160}
          chartConfig={chartConfig}
          bezier
          style={{ borderRadius: RADIUS.md }}
          withDots={false}
        />
      </View>
    </ScrollView>
  );
}

// @group BusinessLogic > ProcessDetail > ConfigTab : Process config display with log file shortcut
function ConfigTab({
  process,
  onViewLogFiles,
}: {
  process: DashboardStackParamList['ProcessDetail']['process'];
  onViewLogFiles: () => void;
}): React.JSX.Element {
  const env = process.pm2_env;
  const rows: [string, string][] = [
    ['PM ID', String(env.pm_id)],
    ['PID', String(process.pid > 0 ? process.pid : '—')],
    ['Namespace', env.namespace],
    ['Exec Mode', env.exec_mode === 'cluster_mode' ? 'Cluster' : 'Fork'],
    ['Instances', String(env.instances)],
    ['Interpreter', env.exec_interpreter],
    ['Script', env.pm_exec_path],
    ['CWD', env.pm_cwd],
    ['Restarts', String(env.restart_time)],
    ['Unstable Restarts', String(env.unstable_restarts)],
    ['Autorestart', env.autorestart ? 'Yes' : 'No'],
    ['Watch', env.watch ? 'Yes' : 'No'],
    ['stdout Log', env.pm_out_log_path],
    ['stderr Log', env.pm_err_log_path],
    ['Version', env.version ?? '—'],
    ['Created', new Date(env.created_at).toLocaleString()],
  ];

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: SPACING.md, gap: 1 }}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.configRow}>
          <Text style={styles.configLabel}>{label}</Text>
          <Text style={styles.configValue} numberOfLines={2} selectable>{value}</Text>
        </View>
      ))}
      {Object.keys(env.env ?? {}).length > 0 && (
        <>
          <Text style={[styles.configLabel, { marginTop: SPACING.md, marginBottom: SPACING.sm, fontSize: FONT_SIZE.sm, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
            Environment Variables
          </Text>
          {Object.entries(env.env).map(([k, v]) => (
            <View key={k} style={styles.configRow}>
              <Text style={styles.configLabel}>{k}</Text>
              <Text style={styles.configValue} selectable numberOfLines={1}>{v}</Text>
            </View>
          ))}
        </>
      )}
      {/* Log Files shortcut */}
      <TouchableOpacity style={styles.logFilesShortcut} onPress={onViewLogFiles}>
        <Icon name="folder-open-outline" size={16} color={COLORS.primary} />
        <Text style={styles.logFilesShortcutText}>Browse Log Files</Text>
        <Icon name="chevron-forward" size={14} color={COLORS.primary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

// @group BusinessLogic > ProcessDetail : Main screen component
export default function ProcessDetailScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { process } = route.params;
  const isCluster = process.pm2_env.exec_mode === 'cluster_mode';
  const [activeTab, setActiveTab] = useState<DetailTab>('logs');
  const [actionLoading, setActionLoading] = useState(false);
  const env = process.pm2_env;

  async function handleAction(action: ProcessAction): Promise<void> {
    if (action === 'delete') {
      Alert.alert('Delete Process', `Delete "${process.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await processAction(process.pm_id, 'delete');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Action failed');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]);
      return;
    }
    setActionLoading(true);
    try {
      await processAction(process.pm_id, action);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  const uptime = env.status === 'online' ? formatUptime(Date.now() - env.pm_uptime) : '—';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Process summary header */}
      <View style={styles.processHeader}>
        <View style={styles.processHeaderRow}>
          <View style={styles.processInfo}>
            <Text style={styles.processName}>{process.name}</Text>
            <View style={styles.processMetaRow}>
              <StatusBadge status={env.status} />
              <Text style={styles.processMeta}>PID {process.pid > 0 ? process.pid : '—'}</Text>
              {env.namespace !== 'default' && (
                <View style={styles.nsBadge}>
                  <Text style={styles.nsText}>{env.namespace}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Quick metrics */}
        <View style={styles.quickMetrics}>
          <View style={styles.qMetric}>
            <Text style={styles.qMetricLabel}>CPU</Text>
            <Text style={styles.qMetricValue}>{process.monit.cpu.toFixed(1)}%</Text>
          </View>
          <View style={styles.qMetricDiv} />
          <View style={styles.qMetric}>
            <Text style={styles.qMetricLabel}>Memory</Text>
            <Text style={styles.qMetricValue}>{formatBytes(process.monit.memory)}</Text>
          </View>
          <View style={styles.qMetricDiv} />
          <View style={styles.qMetric}>
            <Text style={styles.qMetricLabel}>Uptime</Text>
            <Text style={styles.qMetricValue}>{uptime}</Text>
          </View>
          <View style={styles.qMetricDiv} />
          <View style={styles.qMetric}>
            <Text style={styles.qMetricLabel}>Restarts</Text>
            <Text style={styles.qMetricValue}>{env.restart_time}</Text>
          </View>
        </View>

        <ActionBar status={env.status} onAction={handleAction} loading={actionLoading} />

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {([
            { key: 'logs', icon: 'terminal-outline', label: 'Logs' },
            { key: 'metrics', icon: 'stats-chart-outline', label: 'Metrics' },
            ...(isCluster ? [{ key: 'cluster', icon: 'git-branch-outline', label: 'Cluster' }] : []),
            { key: 'config', icon: 'settings-outline', label: 'Config' },
          ] as { key: DetailTab; icon: string; label: string }[]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon
                name={tab.icon as any}
                size={15}
                color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab content */}
      <View style={styles.tabContentWrapper}>
        {activeTab === 'logs' && <LogsTab processId={process.pm_id} />}
        {activeTab === 'metrics' && <MetricsTab processId={process.pm_id} />}
        {activeTab === 'cluster' && isCluster && (
          <View style={styles.tabContent}>
            <TouchableOpacity
              style={styles.clusterShortcut}
              onPress={() => navigation.navigate('Cluster', { process })}
            >
              <View style={styles.clusterShortcutLeft}>
                <Icon name="git-branch-outline" size={20} color={COLORS.primary} />
                <View>
                  <Text style={styles.clusterShortcutTitle}>Cluster Management</Text>
                  <Text style={styles.clusterShortcutSub}>
                    {env.instances ?? 1} instance{(env.instances ?? 1) !== 1 ? 's' : ''} · Scale, reload, switch mode
                  </Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
        {activeTab === 'config' && (
          <ConfigTab
            process={process}
            onViewLogFiles={() => navigation.navigate('LogFiles', { processId: process.pm_id, processName: process.name })}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  processHeader: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.md,
  },
  processHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  processInfo: { gap: 6, flex: 1 },
  processName: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.textPrimary },
  processMetaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  processMeta: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  nsBadge: { backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  nsText: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '600' },
  quickMetrics: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  qMetric: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm },
  qMetricDiv: { width: 1, backgroundColor: COLORS.border },
  qMetricLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  qMetricValue: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  actionBar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  tabContentWrapper: { flex: 1 },
  tabContent: { flex: 1, backgroundColor: COLORS.background },
  logControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  logTypeToggle: { flexDirection: 'row', gap: 4 },
  logTypeBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logTypeBtnActive: { backgroundColor: `${COLORS.primary}20`, borderColor: `${COLORS.primary}50` },
  logTypeBtnText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '600' },
  logTypeBtnTextActive: { color: COLORS.primary },
  logActions: { flexDirection: 'row', gap: 4 },
  logActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logActionBtnActive: { borderColor: `${COLORS.success}50` },
  logActionBtnText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  logList: { flex: 1, backgroundColor: '#0a0e1a' },
  logListContent: { padding: SPACING.sm },
  logLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#a8d8a8',
    lineHeight: 18,
  },
  logEmpty: {
    color: COLORS.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: FONT_SIZE.sm,
    padding: SPACING.lg,
    textAlign: 'center',
  },
  logError: { color: COLORS.error, padding: SPACING.lg, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: FONT_SIZE.sm },
  logLoadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chartTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  configRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
    alignItems: 'flex-start',
  },
  configLabel: {
    width: 120,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flexShrink: 0,
  },
  configValue: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logFilesShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  logFilesShortcutText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  clusterShortcut: {
    margin: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  clusterShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  clusterShortcutTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  clusterShortcutSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
