// @group BusinessLogic > MetricsHistory : System-level metrics history with live accumulation

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { LineChart } from 'react-native-chart-kit';
import { useMetrics } from '../hooks/useMetrics';
import { socketManager } from '../services/socket';
import type { SystemMetrics } from '../types';
import { formatBytes, formatTimestamp } from '../utils';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../utils/theme';
import LoadingView from '../components/LoadingView';
import SectionHeader from '../components/SectionHeader';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_HISTORY = 60; // keep last 60 data points (~5 min at ~5s intervals)

interface SystemHistoryEntry {
  timestamp: number;
  loadAvg1: number;
  memPercent: number;
  memUsedMb: number;
}

type TimeRange = '1m' | '5m' | '15m' | 'all';

// @group BusinessLogic > MetricsHistory > Hook : Accumulate real-time system metrics history
function useSystemHistory(): { history: SystemHistoryEntry[]; clear: () => void } {
  const [history, setHistory] = useState<SystemHistoryEntry[]>([]);
  const historyRef = useRef<SystemHistoryEntry[]>([]);

  useEffect(() => {
    const unsub = socketManager.onMetricsUpdate((metrics: SystemMetrics) => {
      const entry: SystemHistoryEntry = {
        timestamp: Date.now(),
        loadAvg1: metrics.loadAvg[0],
        memPercent: (metrics.memory.used / metrics.memory.total) * 100,
        memUsedMb: metrics.memory.used / 1024 / 1024,
      };
      historyRef.current = [...historyRef.current, entry].slice(-MAX_HISTORY);
      setHistory([...historyRef.current]);
    });
    return unsub;
  }, []);

  const clear = useCallback(() => {
    historyRef.current = [];
    setHistory([]);
  }, []);

  return { history, clear };
}

// @group BusinessLogic > MetricsHistory > StatCard : Single metric stat card
function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: string;
}): React.JSX.Element {
  return (
    <View style={[styles.statCard, { borderColor: `${color}25` }]}>
      <Icon name={icon as any} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

export default function MetricsHistoryScreen(): React.JSX.Element {
  const { metrics } = useMetrics();
  const { history, clear } = useSystemHistory();
  const [timeRange, setTimeRange] = useState<TimeRange>('5m');

  const timeRanges: { key: TimeRange; label: string; points: number }[] = [
    { key: '1m', label: '1m', points: 12 },
    { key: '5m', label: '5m', points: 60 },
    { key: '15m', label: '15m', points: MAX_HISTORY },
    { key: 'all', label: 'All', points: MAX_HISTORY },
  ];

  const selectedRange = timeRanges.find((r) => r.key === timeRange)!;
  const sliced = history.slice(-selectedRange.points);

  if (!metrics && history.length === 0) {
    return <LoadingView message="Collecting metrics…" />;
  }

  const cpuCount = metrics?.cpus ?? 1;
  const memPercent = metrics ? (metrics.memory.used / metrics.memory.total) * 100 : 0;

  // Build chart data with at least 2 points (chart requirement)
  const chartData = sliced.length >= 2 ? sliced : [
    ...(sliced.length === 1 ? [sliced[0]] : []),
    { timestamp: Date.now(), loadAvg1: 0, memPercent: 0, memUsedMb: 0 },
    { timestamp: Date.now(), loadAvg1: 0, memPercent: 0, memUsedMb: 0 },
  ];

  const loadData = chartData.map((h) => parseFloat(h.loadAvg1.toFixed(2)));
  const memData = chartData.map((h) => parseFloat(h.memPercent.toFixed(1)));
  const labels = chartData.map((h, i) =>
    i % Math.max(1, Math.floor(chartData.length / 4)) === 0
      ? formatTimestamp(h.timestamp).replace(':00', '')
      : ''
  );

  const baseChartConfig = {
    backgroundColor: COLORS.background,
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    decimalPlaces: 1,
    labelColor: () => COLORS.textMuted,
    propsForDots: { r: '0' },
    propsForBackgroundLines: { stroke: COLORS.border, strokeDasharray: '' },
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Live stats row */}
        {metrics && (
          <>
            <SectionHeader title="Current State" />
            <View style={styles.statsRow}>
              <StatCard
                label="Load 1m"
                value={metrics.loadAvg[0].toFixed(2)}
                sub={`/ ${cpuCount} CPUs`}
                color={metrics.loadAvg[0] > cpuCount ? COLORS.error : metrics.loadAvg[0] > cpuCount * 0.7 ? COLORS.warning : COLORS.success}
                icon="speedometer-outline"
              />
              <StatCard
                label="Memory"
                value={`${memPercent.toFixed(0)}%`}
                sub={formatBytes(metrics.memory.used)}
                color={memPercent > 85 ? COLORS.error : memPercent > 70 ? COLORS.warning : COLORS.primary}
                icon="hardware-chip-outline"
              />
              <StatCard
                label="Points"
                value={String(history.length)}
                sub="collected"
                color={COLORS.textSecondary}
                icon="analytics-outline"
              />
            </View>
          </>
        )}

        {/* Time range selector */}
        <View style={styles.rangeBar}>
          {timeRanges.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.rangeChip, timeRange === r.key && styles.rangeChipActive]}
              onPress={() => setTimeRange(r.key)}
            >
              <Text style={[styles.rangeChipText, timeRange === r.key && styles.rangeChipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.clearBtn} onPress={clear}>
            <Icon name="trash-outline" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {history.length < 2 ? (
          <View style={styles.collectingBanner}>
            <Icon name="hourglass-outline" size={20} color={COLORS.textMuted} />
            <Text style={styles.collectingText}>
              Collecting data… stay on this screen for a few seconds to see charts
            </Text>
          </View>
        ) : (
          <>
            {/* Load average chart */}
            <SectionHeader title="System Load Average" />
            <View style={styles.chartCard}>
              <LineChart
                data={{ labels, datasets: [{ data: loadData }] }}
                width={SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2}
                height={160}
                chartConfig={{
                  ...baseChartConfig,
                  color: (opacity = 1) =>
                    metrics && loadData[loadData.length - 1] > cpuCount
                      ? `rgba(239, 68, 68, ${opacity})`
                      : `rgba(59, 130, 246, ${opacity})`,
                }}
                bezier
                withDots={false}
                style={{ borderRadius: RADIUS.md }}
              />
              <View style={styles.chartLegend}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.legendText}>Load avg (1 min)</Text>
                <Text style={styles.legendValue}>
                  {metrics ? `${metrics.loadAvg[0].toFixed(2)} / ${cpuCount} CPUs` : '—'}
                </Text>
              </View>
            </View>

            {/* Memory % chart */}
            <SectionHeader title="Memory Usage (%)" />
            <View style={styles.chartCard}>
              <LineChart
                data={{ labels, datasets: [{ data: memData }] }}
                width={SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2}
                height={160}
                chartConfig={{
                  ...baseChartConfig,
                  color: (opacity = 1) =>
                    memData[memData.length - 1] > 85
                      ? `rgba(239, 68, 68, ${opacity})`
                      : memData[memData.length - 1] > 70
                      ? `rgba(245, 158, 11, ${opacity})`
                      : `rgba(34, 197, 94, ${opacity})`,
                }}
                bezier
                withDots={false}
                style={{ borderRadius: RADIUS.md }}
              />
              <View style={styles.chartLegend}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.legendText}>Memory used %</Text>
                {metrics && (
                  <Text style={styles.legendValue}>
                    {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
                  </Text>
                )}
              </View>
            </View>

            {/* Stats table */}
            {sliced.length >= 2 && (
              <>
                <SectionHeader title="Summary" />
                <View style={styles.summaryCard}>
                  {[
                    {
                      label: 'Avg Load',
                      value: (sliced.reduce((s, h) => s + h.loadAvg1, 0) / sliced.length).toFixed(2),
                    },
                    {
                      label: 'Peak Load',
                      value: Math.max(...sliced.map((h) => h.loadAvg1)).toFixed(2),
                    },
                    {
                      label: 'Avg Memory',
                      value: `${(sliced.reduce((s, h) => s + h.memPercent, 0) / sliced.length).toFixed(1)}%`,
                    },
                    {
                      label: 'Peak Memory',
                      value: `${Math.max(...sliced.map((h) => h.memPercent)).toFixed(1)}%`,
                    },
                  ].map(({ label, value }, i, arr) => (
                    <View key={label} style={[styles.summaryRow, i < arr.length - 1 && styles.summaryDivider]}>
                      <Text style={styles.summaryLabel}>{label}</Text>
                      <Text style={styles.summaryValue}>{value}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },

  // @group Styles > Stats
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 3,
  },
  statValue: { fontSize: FONT_SIZE.lg, fontWeight: '800' },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '500' },
  statSub: { fontSize: 9, color: COLORS.textMuted },

  // @group Styles > RangeBar
  rangeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  rangeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  rangeChipActive: { backgroundColor: COLORS.primary },
  rangeChipText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted },
  rangeChipTextActive: { color: '#fff' },
  clearBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // @group Styles > Collecting
  collectingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  collectingText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },

  // @group Styles > Charts
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
    overflow: 'hidden',
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendDot: { width: 8, height: 8, borderRadius: RADIUS.full },
  legendText: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  legendValue: { fontSize: FONT_SIZE.xs, color: COLORS.textPrimary, fontWeight: '600' },

  // @group Styles > Summary
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  summaryDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  summaryLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  summaryValue: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textPrimary },
});
