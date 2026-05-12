// @group BusinessLogic > Metrics : System metrics screen with charts and per-process metrics

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { BarChart } from 'react-native-chart-kit';
import { useMetrics } from '../hooks/useMetrics';
import { useProcesses } from '../hooks/useProcesses';
import MetricCard from '../components/MetricCard';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import SectionHeader from '../components/SectionHeader';
import { formatBytes, formatSystemUptime, formatMemoryPercent } from '../utils';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_FAMILY } from '../utils/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MetricsScreen(): React.JSX.Element {
  const { metrics, loading, error, refresh } = useMetrics();
  const { processes } = useProcesses();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const memoryChartData = useMemo(() => {
    if (!metrics) return null;
    const used = metrics.memory.used / 1024 / 1024 / 1024;
    const free = metrics.memory.free / 1024 / 1024 / 1024;
    return {
      labels: ['Used', 'Free'],
      datasets: [{ data: [parseFloat(used.toFixed(2)), parseFloat(free.toFixed(2))] }],
    };
  }, [metrics]);

  const processMetrics = useMemo(() =>
    [...processes]
      .filter((p) => p.pm2_env.status === 'online')
      .sort((a, b) => b.monit.cpu - a.monit.cpu)
      .slice(0, 10),
    [processes]
  );

  if (loading && !metrics) return <LoadingView message="Loading metrics..." />;
  if (error && !metrics) return <ErrorView message={error} onRetry={refresh} />;
  if (!metrics) return <LoadingView />;

  const memPercent = ((metrics.memory.used / metrics.memory.total) * 100).toFixed(1);
  const cpuCount = metrics.cpus ?? 0;

  const chartConfig = {
    backgroundColor: '#000000',
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 255, 65, ${opacity})`,
    labelColor: () => COLORS.textMuted,
    barPercentage: 0.6,
    style: { borderRadius: RADIUS.sm },
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{'>'}_  SYS.METRICS</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
          <Icon name="refresh-outline" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        {/* System overview cards */}
        <SectionHeader title="System Overview" />
        <View style={styles.cardsRow}>
          <MetricCard
            icon="speedometer-outline"
            iconColor={COLORS.primary}
            label="Load 1m"
            value={metrics.loadAvg[0].toFixed(2)}
            subValue={`5m: ${metrics.loadAvg[1].toFixed(2)} | 15m: ${metrics.loadAvg[2].toFixed(2)}`}
          />
          <MetricCard
            icon="hardware-chip-outline"
            iconColor={COLORS.warning}
            label="CPUs"
            value={String(cpuCount)}
            subValue={cpuCount > 0 ? `${cpuCount} logical core${cpuCount !== 1 ? 's' : ''}` : '—'}
          />
        </View>
        <View style={styles.cardsRow}>
          <MetricCard
            icon="server-outline"
            iconColor={COLORS.success}
            label="Memory"
            value={`${memPercent}%`}
            subValue={`${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}`}
          />
          <MetricCard
            icon="time-outline"
            iconColor={COLORS.primary}
            label="Uptime"
            value={formatSystemUptime(metrics.uptime)}
          />
        </View>

        {/* Memory bar chart */}
        {memoryChartData && (
          <View style={styles.chartSection}>
            <SectionHeader title="Memory Distribution (GB)" />
            <View style={styles.chartCard}>
              <BarChart
                data={memoryChartData}
                width={SCREEN_WIDTH - SPACING.lg * 2 - SPACING.xl * 2}
                height={140}
                chartConfig={chartConfig}
                style={{ borderRadius: RADIUS.md }}
                showValuesOnTopOfBars
                fromZero
                yAxisLabel=""
                yAxisSuffix=" GB"
              />
            </View>
          </View>
        )}

        {/* Memory progress bar */}
        <View style={styles.memoryBar}>
          <View style={styles.memoryBarHeader}>
            <Text style={styles.memoryBarLabel}>Memory Usage</Text>
            <Text style={styles.memoryBarValue}>
              {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
            </Text>
          </View>
          <View style={styles.memoryBarTrack}>
            <View
              style={[
                styles.memoryBarFill,
                {
                  width: `${Math.min(100, parseFloat(memPercent))}%`,
                  backgroundColor: parseFloat(memPercent) > 85 ? COLORS.error : parseFloat(memPercent) > 70 ? COLORS.warning : COLORS.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.memoryBarSub}>
            {formatBytes(metrics.memory.free)} free
          </Text>
        </View>

        {/* Load average cards */}
        <SectionHeader title="Load Average" />
        <View style={styles.loadRow}>
          {(['1 min', '5 min', '15 min'] as const).map((label, i) => (
            <View key={label} style={styles.loadCard}>
              <Text style={styles.loadLabel}>{label}</Text>
              <Text style={[styles.loadValue, {
                color: metrics.loadAvg[i] > cpuCount ? COLORS.error : metrics.loadAvg[i] > cpuCount * 0.8 ? COLORS.warning : COLORS.success
              }]}>
                {metrics.loadAvg[i].toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Per-process metrics */}
        {processMetrics.length > 0 && (
          <>
            <SectionHeader title={`Top Processes by CPU (${processMetrics.length})`} />
            {processMetrics.map((proc) => (
              <View key={proc.pm_id} style={styles.procMetricRow}>
                <View style={styles.procMetricLeft}>
                  <Text style={styles.procMetricName} numberOfLines={1}>{proc.name}</Text>
                  <Text style={styles.procMetricSub}>{formatBytes(proc.monit.memory)}</Text>
                </View>
                <View style={styles.procMetricRight}>
                  <Text style={[styles.procMetricCpu, { color: proc.monit.cpu > 50 ? COLORS.error : proc.monit.cpu > 20 ? COLORS.warning : COLORS.success }]}>
                    {proc.monit.cpu.toFixed(1)}%
                  </Text>
                  <View style={styles.cpuBar}>
                    <View style={[styles.cpuBarFill, {
                      width: `${Math.min(100, proc.monit.cpu)}%`,
                      backgroundColor: proc.monit.cpu > 50 ? COLORS.error : proc.monit.cpu > 20 ? COLORS.warning : COLORS.success,
                    }]} />
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
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
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  cardsRow: { flexDirection: 'row', gap: SPACING.sm },
  chartSection: { gap: SPACING.sm },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  memoryBar: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  memoryBarHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  memoryBarLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  memoryBarValue: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '600' },
  memoryBarTrack: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  memoryBarFill: { height: '100%', borderRadius: RADIUS.full },
  memoryBarSub: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  loadRow: { flexDirection: 'row', gap: SPACING.sm },
  loadCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    padding: SPACING.md,
    gap: 4,
  },
  loadLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '500' },
  loadValue: { fontSize: FONT_SIZE.xl, fontWeight: '800' },
  procMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    gap: SPACING.md,
  },
  procMetricLeft: { flex: 1, gap: 2 },
  procMetricName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  procMetricSub: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  procMetricRight: { alignItems: 'flex-end', gap: 4, width: 80 },
  procMetricCpu: { fontSize: FONT_SIZE.md, fontWeight: '700' },
  cpuBar: {
    width: 70,
    height: 4,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  cpuBarFill: { height: '100%', borderRadius: RADIUS.full },
});
