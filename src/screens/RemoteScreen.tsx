// @group BusinessLogic > Remote : Remote connection management screen

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import {
  fetchRemoteConnections,
  connectRemote,
  disconnectRemote,
  fetchRemoteProcesses,
  fetchRemoteSystemInfo,
} from '../services/api';
import type { RemoteConnection, PM2Process, RemoteSystemInfo } from '../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../utils/theme';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import StatusBadge from '../components/StatusBadge';
import { formatBytes, formatSystemUptime } from '../utils';

// @group BusinessLogic > Remote > ConnectionCard : Individual remote connection card
function ConnectionCard({
  connection,
  onConnect,
  onDisconnect,
  onViewProcesses,
  loading,
}: {
  connection: RemoteConnection;
  onConnect: () => void;
  onDisconnect: () => void;
  onViewProcesses: () => void;
  loading: boolean;
}): React.JSX.Element {
  const isConnected = connection.connected;
  const status = connection.status ?? (isConnected ? 'connected' : 'disconnected');
  const statusColor = isConnected ? COLORS.success : status === 'error' ? COLORS.error : COLORS.textMuted;
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={styles.connectionCard}>
      <View style={styles.connectionHeader}>
        <View style={styles.connectionInfo}>
          <View style={styles.connectionNameRow}>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            <Text style={styles.connectionName}>{connection.name ?? connection.host ?? 'Unknown'}</Text>
          </View>
          <Text style={styles.connectionHost}>
            {connection.host}:{connection.port}
          </Text>
        </View>
        <View style={[styles.statusPill, isConnected
          ? { borderColor: 'rgba(0,255,65,0.25)', backgroundColor: 'rgba(0,255,65,0.08)' }
          : status === 'error'
            ? { borderColor: 'rgba(255,0,60,0.25)', backgroundColor: 'rgba(255,0,60,0.08)' }
            : { borderColor: 'rgba(0,85,24,0.25)', backgroundColor: 'rgba(0,85,24,0.08)' }]}>
          <Text style={[styles.statusPillText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.connectionActions}>
        {isConnected ? (
          <>
            <TouchableOpacity
            style={[styles.connBtn, { borderColor: 'rgba(0,255,65,0.25)', backgroundColor: 'rgba(0,255,65,0.08)' }]}
              onPress={onViewProcesses}
            >
              <Icon name="list-outline" size={14} color={COLORS.primary} />
              <Text style={[styles.connBtnText, { color: COLORS.primary }]}>View Processes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.connBtn, { borderColor: 'rgba(255,179,0,0.25)', backgroundColor: 'rgba(255,179,0,0.08)' }]}
              onPress={onDisconnect}
              disabled={loading}
            >
              {loading ? <ActivityIndicator size="small" color={COLORS.warning} /> : (
                <>
                  <Icon name="unlink-outline" size={14} color={COLORS.warning} />
                  <Text style={[styles.connBtnText, { color: COLORS.warning }]}>Disconnect</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.connBtn, { borderColor: 'rgba(0,255,65,0.25)', backgroundColor: 'rgba(0,255,65,0.08)', flex: 1 }]}
            onPress={onConnect}
            disabled={loading}
          >
            {loading ? <ActivityIndicator size="small" color={COLORS.success} /> : (
              <>
                <Icon name="link-outline" size={14} color={COLORS.success} />
                <Text style={[styles.connBtnText, { color: COLORS.success }]}>Connect</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// @group BusinessLogic > Remote > ProcessesModal : Remote processes list modal
function RemoteProcessesModal({
  visible,
  connectionId,
  connectionName,
  onClose,
}: {
  visible: boolean;
  connectionId: string;
  connectionName: string;
  onClose: () => void;
}): React.JSX.Element {
  const [processes, setProcesses] = useState<PM2Process[]>([]);
  const [sysInfo, setSysInfo] = useState<RemoteSystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!visible || !connectionId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchRemoteProcesses(connectionId),
      fetchRemoteSystemInfo(connectionId),
    ])
      .then(([procs, info]) => {
        setProcesses(procs);
        setSysInfo(info);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [visible, connectionId]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{connectionName}</Text>
              <Text style={styles.modalSubtitle}>Remote Processes</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close-outline" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.modalCenter}><ActivityIndicator color={COLORS.primary} /></View>
          ) : error ? (
            <View style={styles.modalCenter}><Text style={styles.errorText}>{error}</Text></View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalContent}>
              {sysInfo && (
                <View style={styles.sysInfoCard}>
                  <Text style={styles.sysInfoTitle}>System Info</Text>
                  <View style={styles.sysInfoGrid}>
                    <View style={styles.sysInfoItem}>
                      <Text style={styles.sysInfoLabel}>Hostname</Text>
                      <Text style={styles.sysInfoValue}>{sysInfo.hostname}</Text>
                    </View>
                    <View style={styles.sysInfoItem}>
                      <Text style={styles.sysInfoLabel}>Platform</Text>
                      <Text style={styles.sysInfoValue}>{sysInfo.platform}</Text>
                    </View>
                    <View style={styles.sysInfoItem}>
                      <Text style={styles.sysInfoLabel}>Memory</Text>
                      <Text style={styles.sysInfoValue}>
                        {formatBytes(sysInfo.memory?.used ?? 0)} / {formatBytes(sysInfo.memory?.total ?? 0)}
                      </Text>
                    </View>
                    <View style={styles.sysInfoItem}>
                      <Text style={styles.sysInfoLabel}>Uptime</Text>
                      <Text style={styles.sysInfoValue}>{formatSystemUptime(sysInfo.uptime)}</Text>
                    </View>
                  </View>
                </View>
              )}

              <Text style={styles.processesSectionTitle}>
                Processes ({processes.length})
              </Text>
              {processes.map((p, idx) => (
                <View key={p.pm_id ?? p.name ?? idx} style={styles.remoteProcessRow}>
                  <View style={styles.remoteProcessLeft}>
                    <Text style={styles.remoteProcessName}>{p.name}</Text>
                    <Text style={styles.remoteProcessSub}>
                      CPU {(p.monit?.cpu ?? 0).toFixed(1)}% | {formatBytes(p.monit?.memory ?? 0)}
                    </Text>
                  </View>
                  <StatusBadge status={(p.pm2_env?.status ?? 'stopped') as import('../utils').ProcessStatus} size="sm" />
                </View>
              ))}
              {processes.length === 0 && (
                <Text style={styles.emptyText}>No processes on this server</Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// @group BusinessLogic > Remote > Screen : Main remote connections screen
export default function RemoteScreen(): React.JSX.Element {
  const [connections, setConnections] = useState<RemoteConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewProcesses, setViewProcesses] = useState<{ id: string; name: string } | null>(null);

  const loadConnections = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchRemoteConnections();
      setConnections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadConnections(); }, [loadConnections]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConnections();
    setRefreshing(false);
  };

  async function handleConnect(id: string): Promise<void> {
    setActionLoading(id);
    try {
      await connectRemote(id);
      await loadConnections();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDisconnect(id: string): Promise<void> {
    setActionLoading(id);
    try {
      await disconnectRemote(id);
      await loadConnections();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <LoadingView message="Loading connections..." />;
  if (error && connections.length === 0) return <ErrorView message={error} onRetry={loadConnections} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        data={connections}
        keyExtractor={(item, index) => item?.id ?? String(index)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="globe-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Remote Connections</Text>
            <Text style={styles.emptyDesc}>Configure remote connections in the server settings</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ConnectionCard
            connection={item}
            onConnect={() => handleConnect(item.id)}
            onDisconnect={() => handleDisconnect(item.id)}
            onViewProcesses={() => setViewProcesses({ id: item.id, name: item.name })}
            loading={actionLoading === item.id}
          />
        )}
      />

      {viewProcesses && (
        <RemoteProcessesModal
          visible={true}
          connectionId={viewProcesses.id}
          connectionName={viewProcesses.name}
          onClose={() => setViewProcesses(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  connectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  connectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  connectionInfo: { gap: 3, flex: 1 },
  connectionNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusIndicator: { width: 8, height: 8, borderRadius: RADIUS.full },
  connectionName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  connectionHost: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, fontFamily: 'monospace' },
  statusPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusPillText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  connectionActions: { flexDirection: 'row', gap: SPACING.sm },
  connBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  connBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.textSecondary },
  emptyDesc: { fontSize: FONT_SIZE.md, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: SPACING.xl },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },
  modalSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  modalCenter: { padding: SPACING.xl, alignItems: 'center' },
  modalContent: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  sysInfoCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  sysInfoTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sysInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  sysInfoItem: { width: '48%', gap: 2 },
  sysInfoLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  sysInfoValue: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '600' },
  processesSectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  remoteProcessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  remoteProcessLeft: { gap: 2, flex: 1 },
  remoteProcessName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  remoteProcessSub: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  errorText: { color: COLORS.error, fontSize: FONT_SIZE.md },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', fontSize: FONT_SIZE.md, paddingVertical: SPACING.lg },
});
