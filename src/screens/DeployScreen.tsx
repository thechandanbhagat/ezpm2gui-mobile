// @group BusinessLogic > Deploy : Application deployment screen with SSE progress streaming

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { deployApplication } from '../services/api';
import type { EnvVar, DeployPayload } from '../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../utils/theme';

// @group BusinessLogic > Deploy > ProgressModal : Deploy output streaming modal
function DeployProgressModal({
  visible,
  lines,
  done,
  error,
  onClose,
}: {
  visible: boolean;
  lines: string[];
  done: boolean;
  error: string | null;
  onClose: () => void;
}): React.JSX.Element {
  const flatRef = React.useRef<FlatList>(null);

  React.useEffect(() => {
    if (lines.length > 0) {
      flatRef.current?.scrollToEnd({ animated: true });
    }
  }, [lines]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={done ? onClose : undefined}>
      <View style={styles.progressOverlay}>
        <View style={styles.progressModal}>
          <View style={styles.progressHeader}>
            <View style={styles.progressHeaderLeft}>
              {!done && !error && <ActivityIndicator size="small" color={COLORS.primary} />}
              {done && <Icon name="checkmark-circle" size={20} color={COLORS.success} />}
              {error && <Icon name="close-circle" size={20} color={COLORS.error} />}
              <Text style={styles.progressTitle}>
                {done ? 'Deploy Complete' : error ? 'Deploy Failed' : 'Deploying...'}
              </Text>
            </View>
            {(done || error) && (
              <TouchableOpacity onPress={onClose}>
                <Icon name="close-outline" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            ref={flatRef}
            data={lines}
            keyExtractor={(_, i) => String(i)}
            style={styles.progressLog}
            contentContainerStyle={styles.progressLogContent}
            renderItem={({ item }) => (
              <Text style={[styles.progressLine, item.toLowerCase().includes('error') && styles.progressLineError]}>
                {item}
              </Text>
            )}
          />
          {error && <Text style={styles.progressError}>{error}</Text>}
        </View>
      </View>
    </Modal>
  );
}

// @group BusinessLogic > Deploy > EnvVarRow : Environment variable key-value row
function EnvVarRow({
  envVar,
  onChange,
  onRemove,
}: {
  envVar: EnvVar;
  onChange: (key: string, value: string) => void;
  onRemove: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.envRow}>
      <TextInput
        style={[styles.formInput, styles.envKey]}
        value={envVar.key}
        onChangeText={(v) => onChange(v, envVar.value)}
        placeholder="KEY"
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <TextInput
        style={[styles.formInput, styles.envVal]}
        value={envVar.value}
        onChangeText={(v) => onChange(envVar.key, v)}
        placeholder="value"
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity onPress={onRemove} style={styles.envRemove}>
        <Icon name="close-outline" size={18} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );
}

// @group BusinessLogic > Deploy > Screen : Main deploy screen
export default function DeployScreen(): React.JSX.Element {
  const [appPath, setAppPath] = useState('');
  const [name, setName] = useState('');
  const [script, setScript] = useState('index.js');
  const [instances, setInstances] = useState('1');
  const [execMode, setExecMode] = useState<'fork' | 'cluster'>('fork');
  const [envVars, setEnvVars] = useState<EnvVar[]>([{ key: 'NODE_ENV', value: 'production' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showProgress, setShowProgress] = useState(false);
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [deployDone, setDeployDone] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!appPath.trim()) e.appPath = 'App path is required';
    if (!name.trim()) e.name = 'Process name is required';
    if (!script.trim()) e.script = 'Start script is required';
    const inst = parseInt(instances, 10);
    if (isNaN(inst) || inst < 1) e.instances = 'Must be a positive number';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleDeploy(): Promise<void> {
    if (!validate()) return;

    const envObj: Record<string, string> = {};
    envVars.forEach(({ key, value }) => { if (key.trim()) envObj[key.trim()] = value; });

    const payload: DeployPayload = {
      appPath: appPath.trim(),
      name: name.trim(),
      script: script.trim(),
      instances: parseInt(instances, 10),
      execMode,
      envVars: envObj,
    };

    setProgressLines([]);
    setDeployDone(false);
    setDeployError(null);
    setShowProgress(true);

    await deployApplication(
      payload,
      (line) => setProgressLines((prev) => [...prev, line]),
      () => setDeployDone(true),
      (err) => setDeployError(err)
    );
  }

  function addEnvVar(): void {
    setEnvVars((prev) => [...prev, { key: '', value: '' }]);
  }

  function updateEnvVar(index: number, key: string, value: string): void {
    setEnvVars((prev) => prev.map((e, i) => i === index ? { key, value } : e));
  }

  function removeEnvVar(index: number): void {
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* App Path */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>App Directory Path *</Text>
            <TextInput
              style={[styles.formInput, errors.appPath && styles.formInputError]}
              value={appPath}
              onChangeText={(t) => { setAppPath(t); setErrors((e) => ({ ...e, appPath: '' })); }}
              placeholder="/home/user/my-app"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.appPath && <Text style={styles.formError}>{errors.appPath}</Text>}
          </View>

          {/* Process Name */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Process Name *</Text>
            <TextInput
              style={[styles.formInput, errors.name && styles.formInputError]}
              value={name}
              onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: '' })); }}
              placeholder="my-api"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.name && <Text style={styles.formError}>{errors.name}</Text>}
          </View>

          {/* Start Script */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Start Script *</Text>
            <TextInput
              style={[styles.formInput, errors.script && styles.formInputError]}
              value={script}
              onChangeText={(t) => { setScript(t); setErrors((e) => ({ ...e, script: '' })); }}
              placeholder="index.js"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.script && <Text style={styles.formError}>{errors.script}</Text>}
          </View>

          {/* Instances + Exec Mode */}
          <View style={styles.rowGroup}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Instances</Text>
              <TextInput
                style={[styles.formInput, errors.instances && styles.formInputError]}
                value={instances}
                onChangeText={(t) => { setInstances(t); setErrors((e) => ({ ...e, instances: '' })); }}
                placeholder="1"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />
              {errors.instances && <Text style={styles.formError}>{errors.instances}</Text>}
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Exec Mode</Text>
              <View style={styles.modeToggle}>
                {(['fork', 'cluster'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modeBtn, execMode === m && styles.modeBtnActive]}
                    onPress={() => setExecMode(m)}
                  >
                    <Text style={[styles.modeBtnText, execMode === m && styles.modeBtnTextActive]}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Environment Variables */}
          <View style={styles.formGroup}>
            <View style={styles.envHeader}>
              <Text style={styles.formLabel}>Environment Variables</Text>
              <TouchableOpacity style={styles.addEnvBtn} onPress={addEnvVar}>
                <Icon name="add-outline" size={16} color={COLORS.primary} />
                <Text style={styles.addEnvBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.envList}>
              {envVars.map((ev, idx) => (
                <EnvVarRow
                  key={idx}
                  envVar={ev}
                  onChange={(k, v) => updateEnvVar(idx, k, v)}
                  onRemove={() => removeEnvVar(idx)}
                />
              ))}
              {envVars.length === 0 && (
                <Text style={styles.envEmpty}>No environment variables</Text>
              )}
            </View>
          </View>

          {/* Deploy Button */}
          <TouchableOpacity style={styles.deployBtn} onPress={handleDeploy}>
            <Icon name="rocket-outline" size={20} color="#fff" />
            <Text style={styles.deployBtnText}>Deploy Application</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <DeployProgressModal
        visible={showProgress}
        lines={progressLines}
        done={deployDone}
        error={deployError}
        onClose={() => setShowProgress(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  formGroup: { gap: SPACING.sm },
  formLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  formInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 44,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
  },
  formInputError: { borderColor: COLORS.error },
  formError: { fontSize: FONT_SIZE.sm, color: COLORS.error },
  rowGroup: { flexDirection: 'row', gap: SPACING.md },
  modeToggle: {
    flexDirection: 'row',
    height: 44,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  modeBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: `${COLORS.primary}20` },
  modeBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted },
  modeBtnTextActive: { color: COLORS.primary },
  envHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addEnvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  addEnvBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
  envList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  envRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  envKey: {
    flex: 0.4,
    height: 36,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'monospace',
    backgroundColor: COLORS.background,
  },
  envVal: {
    flex: 0.6,
    height: 36,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'monospace',
    backgroundColor: COLORS.background,
  },
  envRemove: {
    padding: 4,
  },
  envEmpty: { padding: SPACING.md, color: COLORS.textMuted, fontSize: FONT_SIZE.sm, textAlign: 'center' },
  deployBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  deployBtnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: '#fff' },
  // Progress modal
  progressOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  progressModal: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  progressTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  progressLog: { backgroundColor: '#06090f', maxHeight: 300 },
  progressLogContent: { padding: SPACING.sm },
  progressLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#a8d8a8',
    lineHeight: 17,
  },
  progressLineError: { color: COLORS.error },
  progressError: {
    color: COLORS.error,
    padding: SPACING.md,
    fontSize: FONT_SIZE.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
