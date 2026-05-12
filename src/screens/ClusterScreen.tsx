// @group BusinessLogic > Cluster : Cluster management screen — scale, reload, exec-mode switch

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { DashboardStackParamList } from '../types';
import { scaleCluster, reloadCluster, switchExecMode } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import SectionHeader from '../components/SectionHeader';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../utils/theme';

type Route = RouteProp<DashboardStackParamList, 'Cluster'>;

// @group BusinessLogic > Cluster > InstanceStepper : Instance count stepper control
function InstanceStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={[styles.stepperBtn, value <= 1 && styles.stepperBtnDisabled]}
        onPress={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
      >
        <Icon name="remove" size={20} color={value <= 1 ? COLORS.textMuted : COLORS.textPrimary} />
      </TouchableOpacity>
      <View style={styles.stepperValue}>
        <Text style={styles.stepperValueText}>{value}</Text>
        <Text style={styles.stepperValueSub}>instances</Text>
      </View>
      <TouchableOpacity
        style={[styles.stepperBtn, value >= 32 && styles.stepperBtnDisabled]}
        onPress={() => onChange(Math.min(32, value + 1))}
        disabled={disabled || value >= 32}
      >
        <Icon name="add" size={20} color={value >= 32 ? COLORS.textMuted : COLORS.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

// @group BusinessLogic > Cluster > InfoRow : Key/value info row
function InfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ClusterScreen(): React.JSX.Element {
  const route = useRoute<Route>();
  const { process } = route.params;
  const env = process.pm2_env;

  const isCluster = env.exec_mode === 'cluster_mode';
  const currentInstances = env.instances ?? 1;

  const [targetInstances, setTargetInstances] = useState(currentInstances);
  const [scaling, setScaling] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [switching, setSwitching] = useState(false);

  const instancesChanged = targetInstances !== currentInstances;

  // @group BusinessLogic > Cluster > Actions : Scale, reload, and exec-mode actions
  const handleScale = useCallback(async () => {
    Alert.alert(
      'Scale Instances',
      `Change "${process.name}" from ${currentInstances} to ${targetInstances} instance${targetInstances !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Scale',
          onPress: async () => {
            setScaling(true);
            try {
              await scaleCluster(process.pm_id, targetInstances);
              Alert.alert('Success', `Scaled to ${targetInstances} instance${targetInstances !== 1 ? 's' : ''}`);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Scale failed');
            } finally {
              setScaling(false);
            }
          },
        },
      ]
    );
  }, [process.name, process.pm_id, currentInstances, targetInstances]);

  const handleReload = useCallback(async () => {
    Alert.alert(
      'Zero-Downtime Reload',
      `Reload all instances of "${process.name}" with zero downtime?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reload',
          onPress: async () => {
            setReloading(true);
            try {
              await reloadCluster(process.pm_id);
              Alert.alert('Success', 'Reloaded all instances with zero downtime');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Reload failed');
            } finally {
              setReloading(false);
            }
          },
        },
      ]
    );
  }, [process.name, process.pm_id]);

  const handleSwitchMode = useCallback(async () => {
    const targetMode = isCluster ? 'fork' : 'cluster';
    const targetLabel = isCluster ? 'Fork mode' : 'Cluster mode';
    Alert.alert(
      'Switch Execution Mode',
      `Switch "${process.name}" to ${targetLabel}?\n\nThis will stop and restart the process. There will be brief downtime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Switch to ${targetLabel}`,
          style: isCluster ? 'destructive' : 'default',
          onPress: async () => {
            setSwitching(true);
            try {
              await switchExecMode(process.pm_id, targetMode);
              Alert.alert('Success', `Switched to ${targetLabel}`);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Mode switch failed');
            } finally {
              setSwitching(false);
            }
          },
        },
      ]
    );
  }, [isCluster, process.name, process.pm_id]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Process summary */}
        <View style={styles.processCard}>
          <View style={styles.processCardHeader}>
            <View style={styles.processCardInfo}>
              <Text style={styles.processName}>{process.name}</Text>
              <View style={styles.processMetaRow}>
                <StatusBadge status={env.status} />
                <View style={[styles.modeBadge, isCluster ? styles.modeBadgeCluster : styles.modeBadgeFork]}>
                  <Icon
                    name={isCluster ? 'git-branch-outline' : 'code-slash-outline'}
                    size={11}
                    color={isCluster ? COLORS.primary : COLORS.warning}
                  />
                  <Text style={[styles.modeBadgeText, { color: isCluster ? COLORS.primary : COLORS.warning }]}>
                    {isCluster ? 'Cluster' : 'Fork'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.instancesBubble}>
              <Text style={styles.instancesBubbleCount}>{currentInstances}</Text>
              <Text style={styles.instancesBubbleSub}>active</Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <InfoRow label="PM ID" value={String(env.pm_id)} />
            <InfoRow label="Namespace" value={env.namespace} />
            <InfoRow label="Exec Mode" value={isCluster ? 'Cluster Mode' : 'Fork Mode'} />
            <InfoRow label="Interpreter" value={env.exec_interpreter} />
          </View>
        </View>

        {/* Scale instances */}
        <SectionHeader title="Scale Instances" />
        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Adjust the number of running instances. PM2 will gracefully scale up or down.
          </Text>
          <InstanceStepper
            value={targetInstances}
            onChange={setTargetInstances}
            disabled={scaling}
          />
          {instancesChanged && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={handleScale}
              disabled={scaling}
            >
              {scaling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="resize-outline" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>
                    Apply — Scale to {targetInstances}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {!instancesChanged && (
            <View style={styles.noChangeBanner}>
              <Icon name="information-circle-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.noChangeText}>Adjust the count above then tap Apply</Text>
            </View>
          )}
        </View>

        {/* Zero-downtime reload */}
        {isCluster && (
          <>
            <SectionHeader title="Zero-Downtime Reload" />
            <View style={styles.card}>
              <Text style={styles.cardDescription}>
                Reload all instances one by one without any service interruption. New connections go to the new instances.
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSuccess]}
                onPress={handleReload}
                disabled={reloading || env.status !== 'online'}
              >
                {reloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="refresh-circle-outline" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Reload All Instances</Text>
                  </>
                )}
              </TouchableOpacity>
              {env.status !== 'online' && (
                <Text style={styles.warningText}>Process must be online to reload</Text>
              )}
            </View>
          </>
        )}

        {/* Switch exec mode */}
        <SectionHeader title="Execution Mode" />
        <View style={styles.card}>
          <View style={styles.modeRow}>
            <View style={[styles.modeOption, isCluster ? styles.modeOptionInactive : styles.modeOptionActive]}>
              <Icon
                name="code-slash-outline"
                size={22}
                color={!isCluster ? COLORS.warning : COLORS.textMuted}
              />
              <Text style={[styles.modeOptionTitle, !isCluster && { color: COLORS.warning }]}>Fork</Text>
              <Text style={styles.modeOptionSub}>Single process, no shared memory</Text>
            </View>
            <View style={styles.modeSeparator}>
              <Icon name="swap-horizontal-outline" size={18} color={COLORS.textMuted} />
            </View>
            <View style={[styles.modeOption, isCluster ? styles.modeOptionActive : styles.modeOptionInactive]}>
              <Icon
                name="git-branch-outline"
                size={22}
                color={isCluster ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.modeOptionTitle, isCluster && { color: COLORS.primary }]}>Cluster</Text>
              <Text style={styles.modeOptionSub}>Multi-process, shared port</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, isCluster ? styles.actionBtnWarning : styles.actionBtnPrimary]}
            onPress={handleSwitchMode}
            disabled={switching}
          >
            {switching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="swap-horizontal-outline" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>
                  Switch to {isCluster ? 'Fork' : 'Cluster'} Mode
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.warningBanner}>
            <Icon name="warning-outline" size={13} color={COLORS.warning} />
            <Text style={styles.warningBannerText}>
              Switching mode will briefly stop and restart the process
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },

  // @group Styles > ProcessCard
  processCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  processCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  processCardInfo: { gap: 6, flex: 1 },
  processName: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },
  processMetaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  modeBadgeCluster: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: `${COLORS.primary}40`,
  },
  modeBadgeFork: {
    backgroundColor: `${COLORS.warning}15`,
    borderColor: `${COLORS.warning}40`,
  },
  modeBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  instancesBubble: {
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minWidth: 56,
  },
  instancesBubbleCount: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.primary },
  instancesBubbleSub: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '500' },
  infoGrid: { gap: 1, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  infoLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  infoValue: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '600' },

  // @group Styles > Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  cardDescription: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 19 },

  // @group Styles > Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperValue: { alignItems: 'center', minWidth: 80 },
  stepperValueText: { fontSize: FONT_SIZE.xxxl, fontWeight: '800', color: COLORS.textPrimary },
  stepperValueSub: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '500' },

  // @group Styles > ActionButtons
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  actionBtnPrimary: { backgroundColor: COLORS.primary },
  actionBtnSuccess: { backgroundColor: COLORS.success },
  actionBtnWarning: { backgroundColor: COLORS.warning },
  actionBtnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#fff' },
  noChangeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  noChangeText: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },

  // @group Styles > ModeSelector
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modeOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 5,
  },
  modeOptionActive: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  modeOptionInactive: {
    backgroundColor: `${COLORS.surfaceVariant}50`,
    borderColor: 'transparent',
    opacity: 0.5,
  },
  modeOptionTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textMuted },
  modeOptionSub: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textAlign: 'center' },
  modeSeparator: { alignItems: 'center', paddingHorizontal: 4 },

  // @group Styles > Warnings
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.warning}10`,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: `${COLORS.warning}25`,
    padding: SPACING.sm,
  },
  warningBannerText: { fontSize: FONT_SIZE.xs, color: COLORS.warning, flex: 1, lineHeight: 17 },
  warningText: { fontSize: FONT_SIZE.xs, color: COLORS.warning, textAlign: 'center' },
});
