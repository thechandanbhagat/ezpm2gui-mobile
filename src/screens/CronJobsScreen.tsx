// @group BusinessLogic > CronJobs : Cron job management screen with toggle, create, and delete

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import {
  fetchCronJobs,
  toggleCronJob,
  startCronJob,
  stopCronJob,
  deleteCronJob,
  createCronJob,
} from '../services/api';
import type { CronJob, CreateCronJobPayload } from '../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_FAMILY } from '../utils/theme';
import { isValidCronExpression } from '../utils';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

// @group BusinessLogic > CronJobs > StatusBadge : Cron job status bracket display
function CronStatusBadge({ status }: { status: CronJob['status'] }): React.JSX.Element {
  const color =
    status === 'running' ? COLORS.success : status === 'error' ? COLORS.error : COLORS.textMuted;
  const label = status.toUpperCase();
  return (
    <View style={[styles.cronStatusBadge, { borderColor: color + '50', backgroundColor: color + '10' }]}>
      <Text style={[styles.cronStatusBracket, { color: color + '60' }]}>{'['}</Text>
      <Text style={[styles.cronStatusText, { color }]}>{label}</Text>
      <Text style={[styles.cronStatusBracket, { color: color + '60' }]}>{']'}</Text>
    </View>
  );
}

// @group BusinessLogic > CronJobs > CreateModal : Create cron job form modal
function CreateJobModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}): React.JSX.Element {
  const [name, setName] = useState('');
  const [expr, setExpr] = useState('0 * * * *');
  const [scriptPath, setScriptPath] = useState('');
  const [scriptType, setScriptType] = useState<CreateCronJobPayload['scriptType']>('node');
  const [args, setArgs] = useState('');
  const [cwd, setCwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!isValidCronExpression(expr)) e.expr = 'Invalid cron expression (5 or 6 parts)';
    if (!scriptPath.trim()) e.scriptPath = 'Script path is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreate(): Promise<void> {
    if (!validate()) return;
    setLoading(true);
    try {
      await createCronJob({
        name: name.trim(),
        cronExpression: expr.trim(),
        scriptType,
        scriptPath: scriptPath.trim(),
        args: args.trim() || undefined,
        cwd: cwd.trim() || undefined,
      });
      onCreated();
      onClose();
      setName(''); setExpr('0 * * * *'); setScriptPath(''); setArgs(''); setCwd('');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create cron job');
    } finally {
      setLoading(false);
    }
  }

  const scriptTypes: CreateCronJobPayload['scriptType'][] = ['node', 'shell', 'python'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{'>'}_  NEW.JOB</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close-outline" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>// JOB_NAME *</Text>
              <TextInput
                style={[styles.formInput, errors.name ? styles.formInputError : null]}
                value={name}
                onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: '' })); }}
                placeholder="my-backup-job"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
              />
              {errors.name ? <Text style={styles.formError}>{errors.name}</Text> : null}
            </View>

            {/* Cron expression */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>// CRON_EXPR *</Text>
              <TextInput
                style={[styles.formInput, errors.expr ? styles.formInputError : null]}
                value={expr}
                onChangeText={(t) => { setExpr(t); setErrors((e) => ({ ...e, expr: '' })); }}
                placeholder="0 * * * *"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.expr ? (
                <Text style={styles.formError}>{errors.expr}</Text>
              ) : (
                <Text style={styles.formHint}>// min hour day month weekday</Text>
              )}
            </View>

            {/* Script type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>// SCRIPT_TYPE</Text>
              <View style={styles.typeRow}>
                {scriptTypes.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, scriptType === t ? styles.typeChipActive : null]}
                    onPress={() => setScriptType(t)}
                  >
                    <Text style={[styles.typeChipText, scriptType === t ? styles.typeChipTextActive : null]}>
                      {t.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Script path */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>// SCRIPT_PATH *</Text>
              <TextInput
                style={[styles.formInput, errors.scriptPath ? styles.formInputError : null]}
                value={scriptPath}
                onChangeText={(t) => { setScriptPath(t); setErrors((e) => ({ ...e, scriptPath: '' })); }}
                placeholder="/home/user/scripts/backup.js"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.scriptPath ? <Text style={styles.formError}>{errors.scriptPath}</Text> : null}
            </View>

            {/* Args (optional) */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>// ARGS (optional)</Text>
              <TextInput
                style={styles.formInput}
                value={args}
                onChangeText={setArgs}
                placeholder="--verbose --dry-run"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* CWD (optional) */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>// WORK_DIR (optional)</Text>
              <TextInput
                style={styles.formInput}
                value={cwd}
                onChangeText={setCwd}
                placeholder="/home/user/app"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.createBtn, loading ? styles.createBtnDisabled : null]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Icon name="add-outline" size={18} color="#000" />
                  <Text style={styles.createBtnText}>INIT JOB</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// @group BusinessLogic > CronJobs > Screen : Main cron jobs list
export default function CronJobsScreen(): React.JSX.Element {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchCronJobs();
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cron jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  async function handleToggle(job: CronJob): Promise<void> {
    setActionLoading(job.id);
    try {
      await toggleCronJob(job.id);
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, enabled: !j.enabled } : j));
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Toggle failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStart(job: CronJob): Promise<void> {
    setActionLoading(job.id);
    try {
      await startCronJob(job.id);
      await loadJobs();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Start failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStop(job: CronJob): Promise<void> {
    setActionLoading(job.id);
    try {
      await stopCronJob(job.id);
      await loadJobs();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Stop failed');
    } finally {
      setActionLoading(null);
    }
  }

  function handleDelete(job: CronJob): void {
    Alert.alert('Delete Job', `Delete "${job.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(job.id);
          try {
            await deleteCronJob(job.id);
            setJobs((prev) => prev.filter((j) => j.id !== job.id));
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Delete failed');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  }

  if (loading) return <LoadingView message="Loading cron jobs..." />;
  if (error && jobs.length === 0) return <ErrorView message={error} onRetry={loadJobs} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{'>'}_  CRON.SCHED</Text>
          <Text style={styles.headerSub}>{jobs.length} JOBS REGISTERED</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadJobs}>
          <Icon name="refresh-outline" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="time-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>NO JOBS FOUND</Text>
            <Text style={styles.emptyDesc}>// tap + to schedule a new job</Text>
          </View>
        }
        renderItem={({ item: job }) => (
          <View style={[styles.jobCard, { borderLeftColor: job.enabled ? COLORS.primary : COLORS.stopped }]}>
            {/* Job header */}
            <View style={styles.jobHeader}>
              <View style={styles.jobInfo}>
                <Text style={styles.jobName}>{job.name}</Text>
                <Text style={styles.jobExpr}>{job.cronExpression}</Text>
              </View>
              <Switch
                value={job.enabled}
                onValueChange={() => handleToggle(job)}
                trackColor={{ false: COLORS.surface, true: COLORS.primaryDark }}
                thumbColor={job.enabled ? COLORS.primary : COLORS.textMuted}
                disabled={actionLoading === job.id}
              />
            </View>

            {/* Status row */}
            <View style={styles.jobMeta}>
              <CronStatusBadge status={job.status} />
              <View style={styles.scriptTypeBadge}>
                <Text style={styles.scriptTypeText}>{job.scriptType.toUpperCase()}</Text>
              </View>
              {job.lastRun ? (
                <View style={styles.metaItem}>
                  <Icon name="checkmark-circle-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.metaText}>{new Date(job.lastRun).toLocaleString()}</Text>
                </View>
              ) : null}
            </View>

            {/* Script path */}
            <Text style={styles.jobScript} numberOfLines={1}>{job.scriptPath}</Text>

            {/* Actions */}
            <View style={styles.jobActions}>
              {job.status !== 'running' ? (
                <TouchableOpacity
                  style={[styles.jobActionBtn, styles.jobActionBtnSuccess]}
                  onPress={() => handleStart(job)}
                  disabled={actionLoading === job.id}
                >
                  <Icon name="play-outline" size={14} color={COLORS.success} />
                  <Text style={[styles.jobActionBtnText, { color: COLORS.success }]}>RUN</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.jobActionBtn, styles.jobActionBtnWarning]}
                  onPress={() => handleStop(job)}
                  disabled={actionLoading === job.id}
                >
                  <Icon name="stop-outline" size={14} color={COLORS.warning} />
                  <Text style={[styles.jobActionBtnText, { color: COLORS.warning }]}>STOP</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.jobActionBtn, styles.jobActionBtnError, styles.jobActionBtnRight]}
                onPress={() => handleDelete(job)}
                disabled={actionLoading === job.id}
              >
                {actionLoading === job.id ? (
                  <ActivityIndicator size="small" color={COLORS.error} />
                ) : (
                  <>
                    <Icon name="trash-outline" size={14} color={COLORS.error} />
                    <Text style={[styles.jobActionBtnText, { color: COLORS.error }]}>DEL</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Icon name="add" size={28} color="#000" />
      </TouchableOpacity>

      <CreateJobModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadJobs}
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
  headerSub: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
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
  listContent: { padding: SPACING.lg, paddingBottom: 80 },
  jobCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  jobHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  jobInfo: { flex: 1, gap: 4, marginRight: SPACING.sm },
  jobName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textPrimary,
  },
  jobExpr: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  jobMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, alignItems: 'center' },
  cronStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: 1,
  },
  cronStatusBracket: {
    fontFamily: FONT_FAMILY.mono,
    fontWeight: '700',
    fontSize: FONT_SIZE.xs,
  },
  cronStatusText: {
    fontFamily: FONT_FAMILY.mono,
    fontWeight: '700',
    fontSize: FONT_SIZE.xs,
    letterSpacing: 1,
  },
  scriptTypeBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scriptTypeText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.mono, color: COLORS.textMuted },
  jobScript: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  jobActions: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  jobActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    backgroundColor: COLORS.background,
  },
  jobActionBtnSuccess: { borderColor: COLORS.surface },
  jobActionBtnWarning: { borderColor: COLORS.surface },
  jobActionBtnError: { borderColor: COLORS.surface },
  jobActionBtnRight: { marginLeft: 'auto' },
  jobActionBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '700', fontFamily: FONT_FAMILY.mono },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
  emptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textSecondary,
  },
  emptyDesc: { fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.mono, color: COLORS.textMuted },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  modalContent: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  formGroup: { gap: SPACING.sm },
  formLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 44,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.mono,
  },
  formInputError: { borderColor: COLORS.error },
  formError: { fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.mono, color: COLORS.error },
  formHint: { fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.mono, color: COLORS.textMuted },
  typeRow: { flexDirection: 'row', gap: SPACING.sm },
  typeChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  typeChipActive: {
    backgroundColor: COLORS.surfaceVariant,
    borderColor: COLORS.primaryDark,
  },
  typeChipText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  typeChipTextActive: { color: COLORS.primary },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    fontFamily: FONT_FAMILY.mono,
    color: '#000000',
  },
});
