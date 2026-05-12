// @group BusinessLogic > Modules : PM2 module management screen

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { fetchModules, installModule, uninstallModule } from '../services/api';
import type { PM2Module } from '../types';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../utils/theme';

// @group BusinessLogic > Modules > StatusBadge : Module status indicator
function ModuleStatusBadge({ status }: { status: PM2Module['status'] }): React.JSX.Element {
  const color = status === 'online' ? COLORS.success : status === 'errored' ? COLORS.error : COLORS.textMuted;
  return (
    <View style={[styles.statusBadge, { borderColor: `${color}40`, backgroundColor: `${color}15` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{status}</Text>
    </View>
  );
}

export default function ModulesScreen(): React.JSX.Element {
  const [modules, setModules] = useState<PM2Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [installName, setInstallName] = useState('');
  const [installing, setInstalling] = useState(false);
  const [uninstallLoading, setUninstallLoading] = useState<string | null>(null);

  const loadModules = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchModules();
      setModules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadModules(); }, [loadModules]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadModules();
    setRefreshing(false);
  };

  async function handleInstall(): Promise<void> {
    const name = installName.trim();
    if (!name) return;
    setInstalling(true);
    try {
      await installModule(name);
      setInstallName('');
      await loadModules();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Install failed');
    } finally {
      setInstalling(false);
    }
  }

  function handleUninstall(mod: PM2Module): void {
    Alert.alert('Uninstall Module', `Uninstall "${mod.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Uninstall',
        style: 'destructive',
        onPress: async () => {
          setUninstallLoading(mod.name);
          try {
            await uninstallModule(mod.name);
            setModules((prev) => prev.filter((m) => m.name !== mod.name));
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Uninstall failed');
          } finally {
            setUninstallLoading(null);
          }
        },
      },
    ]);
  }

  if (loading) return <LoadingView message="Loading modules..." />;
  if (error && modules.length === 0) return <ErrorView message={error} onRetry={loadModules} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Install new module */}
      <View style={styles.installBar}>
        <TextInput
          style={styles.installInput}
          value={installName}
          onChangeText={setInstallName}
          placeholder="pm2-module-name"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleInstall}
        />
        <TouchableOpacity
          style={[styles.installBtn, (installing || !installName.trim()) && styles.installBtnDisabled]}
          onPress={handleInstall}
          disabled={installing || !installName.trim()}
        >
          {installing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="download-outline" size={16} color="#fff" />
              <Text style={styles.installBtnText}>Install</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={modules}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="cube-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No modules installed</Text>
            <Text style={styles.emptyDesc}>Use the install field above to add PM2 modules</Text>
          </View>
        }
        renderItem={({ item: mod }) => (
          <View style={styles.moduleCard}>
            <View style={styles.moduleLeft}>
              <View style={styles.moduleIcon}>
                <Icon name="cube-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleName}>{mod.name}</Text>
                <View style={styles.moduleMeta}>
                  <Text style={styles.moduleVersion}>v{mod.version}</Text>
                  {mod.description && (
                    <Text style={styles.moduleDesc} numberOfLines={1}>{mod.description}</Text>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.moduleRight}>
              <ModuleStatusBadge status={mod.status} />
              <TouchableOpacity
                style={styles.uninstallBtn}
                onPress={() => handleUninstall(mod)}
                disabled={uninstallLoading === mod.name}
              >
                {uninstallLoading === mod.name ? (
                  <ActivityIndicator size="small" color={COLORS.error} />
                ) : (
                  <Icon name="trash-outline" size={18} color={COLORS.error} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  installBar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  installInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 42,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: 'monospace',
  },
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 42,
  },
  installBtnDisabled: { opacity: 0.5 },
  installBtnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#fff' },
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  moduleLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  moduleIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleInfo: { flex: 1, gap: 3 },
  moduleName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  moduleMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  moduleVersion: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontFamily: 'monospace' },
  moduleDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, flex: 1 },
  moduleRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: RADIUS.full },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  uninstallBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: `${COLORS.error}15`,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.textSecondary },
  emptyDesc: { fontSize: FONT_SIZE.md, color: COLORS.textMuted, textAlign: 'center' },
});
