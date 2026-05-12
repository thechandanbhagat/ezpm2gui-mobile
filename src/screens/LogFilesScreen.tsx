// @group BusinessLogic > LogFiles : Log file browser with inline content viewer

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import type { DashboardStackParamList, LogFileInfo } from '../types';
import { fetchLogFiles, fetchLogFileContents } from '../services/api';
import { formatBytes, formatDate, stripAnsi } from '../utils';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../utils/theme';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import SectionHeader from '../components/SectionHeader';

type Route = RouteProp<DashboardStackParamList, 'LogFiles'>;

// @group BusinessLogic > LogFiles > FileCard : Individual log file card
function FileCard({
  file,
  onView,
}: {
  file: LogFileInfo;
  onView: () => void;
}): React.JSX.Element {
  const isOut = file.type === 'out';
  const isErr = file.type === 'err';
  const iconColor = isOut ? COLORS.success : isErr ? COLORS.error : COLORS.textSecondary;
  const iconName: any = isOut ? 'document-text-outline' : isErr ? 'warning-outline' : 'archive-outline';

  return (
    <TouchableOpacity style={styles.fileCard} onPress={onView} activeOpacity={0.7}>
      <View style={[styles.fileIcon, { backgroundColor: `${iconColor}15` }]}>
        <Icon name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
        <View style={styles.fileMeta}>
          <Text style={styles.fileMetaText}>{formatBytes(file.size)}</Text>
          {file.modified > 0 && (
            <>
              <Text style={styles.fileMetaDot}>·</Text>
              <Text style={styles.fileMetaText}>{formatDate(file.modified)}</Text>
            </>
          )}
          <View style={[styles.typePill, { backgroundColor: `${iconColor}15`, borderColor: `${iconColor}30` }]}>
            <Text style={[styles.typePillText, { color: iconColor }]}>
              {isOut ? 'stdout' : isErr ? 'stderr' : 'rotated'}
            </Text>
          </View>
        </View>
      </View>
      <Icon name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

// @group BusinessLogic > LogFiles > ViewerModal : Inline log file content viewer
function LogViewerModal({
  visible,
  file,
  onClose,
}: {
  visible: boolean;
  file: LogFileInfo | null;
  onClose: () => void;
}): React.JSX.Element {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!visible || !file) return;
    setLines([]);
    setError(null);
    setLoading(true);
    fetchLogFileContents(file.path, 500)
      .then((data) => {
        setLines(data);
        setLoading(false);
        // Scroll to bottom after render
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load file');
        setLoading(false);
      });
  }, [visible, file]);

  async function copyAll(): Promise<void> {
    await Clipboard.setStringAsync(lines.join('\n'));
    Alert.alert('Copied', 'Log content copied to clipboard');
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.viewerSafe} edges={['top', 'bottom']}>
        {/* Viewer header */}
        <View style={styles.viewerHeader}>
          <TouchableOpacity style={styles.viewerCloseBtn} onPress={onClose}>
            <Icon name="close-outline" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.viewerTitleArea}>
            <Text style={styles.viewerTitle} numberOfLines={1}>{file?.name ?? ''}</Text>
            {file && (
              <Text style={styles.viewerSubtitle}>{formatBytes(file.size)}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.viewerCloseBtn} onPress={copyAll} disabled={lines.length === 0}>
            <Icon name="copy-outline" size={19} color={lines.length > 0 ? COLORS.textSecondary : COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Log content */}
        <View style={styles.viewerContent}>
          {loading ? (
            <View style={styles.viewerCenter}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.viewerHint}>Loading file…</Text>
            </View>
          ) : error ? (
            <View style={styles.viewerCenter}>
              <Icon name="alert-circle-outline" size={32} color={COLORS.error} />
              <Text style={styles.viewerError}>{error}</Text>
            </View>
          ) : lines.length === 0 ? (
            <View style={styles.viewerCenter}>
              <Icon name="document-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.viewerHint}>File is empty</Text>
            </View>
          ) : (
            <FlatList
              ref={flatRef}
              data={lines}
              keyExtractor={(_, i) => String(i)}
              style={styles.logList}
              contentContainerStyle={styles.logListContent}
              renderItem={({ item, index }) => (
                <View style={styles.logLineRow}>
                  <Text style={styles.logLineNumber}>{index + 1}</Text>
                  <Text style={styles.logLine}>{stripAnsi(item)}</Text>
                </View>
              )}
            />
          )}
        </View>

        {lines.length > 0 && (
          <View style={styles.viewerFooter}>
            <Text style={styles.viewerFooterText}>
              {lines.length} line{lines.length !== 1 ? 's' : ''} · last 500 shown
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// @group BusinessLogic > LogFiles > Screen : Main log file browser screen
export default function LogFilesScreen(): React.JSX.Element {
  const route = useRoute<Route>();
  const { processId, processName } = route.params;

  const [files, setFiles] = useState<LogFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<LogFileInfo | null>(null);

  const loadFiles = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchLogFiles(processId);
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load log files');
    } finally {
      setLoading(false);
    }
  }, [processId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  if (loading) return <LoadingView message="Loading log files…" />;
  if (error) return <ErrorView message={error} onRetry={loadFiles} />;

  const stdoutFiles = files.filter((f) => f.type === 'out');
  const stderrFiles = files.filter((f) => f.type === 'err');
  const rotatedFiles = files.filter((f) => f.type === 'rotated');

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={null}
        contentContainerStyle={styles.content}
        ListHeaderComponent={() => (
          <View style={{ gap: SPACING.md }}>
            {/* Process info */}
            <View style={styles.processTag}>
              <Icon name="terminal-outline" size={14} color={COLORS.primary} />
              <Text style={styles.processTagText}>{processName}</Text>
              <Text style={styles.processTagCount}>
                {files.length} file{files.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* stdout files */}
            {stdoutFiles.length > 0 && (
              <>
                <SectionHeader title="Standard Output" />
                {stdoutFiles.map((f) => (
                  <FileCard key={f.path} file={f} onView={() => setViewingFile(f)} />
                ))}
              </>
            )}

            {/* stderr files */}
            {stderrFiles.length > 0 && (
              <>
                <SectionHeader title="Standard Error" />
                {stderrFiles.map((f) => (
                  <FileCard key={f.path} file={f} onView={() => setViewingFile(f)} />
                ))}
              </>
            )}

            {/* rotated files */}
            {rotatedFiles.length > 0 && (
              <>
                <SectionHeader title={`Rotated Logs (${rotatedFiles.length})`} />
                {rotatedFiles.map((f) => (
                  <FileCard key={f.path} file={f} onView={() => setViewingFile(f)} />
                ))}
              </>
            )}

            {files.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="document-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Log Files Found</Text>
                <Text style={styles.emptyDesc}>
                  Log files will appear here once the process has written output
                </Text>
              </View>
            )}
          </View>
        )}
      />

      <LogViewerModal
        visible={viewingFile !== null}
        file={viewingFile}
        onClose={() => setViewingFile(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },

  // @group Styles > ProcessTag
  processTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  processTagText: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  processTagCount: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },

  // @group Styles > FileCard
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  fileIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: { flex: 1, gap: 4 },
  fileName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  fileMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  fileMetaText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  fileMetaDot: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  typePillText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },

  // @group Styles > EmptyState
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.textSecondary },
  emptyDesc: { fontSize: FONT_SIZE.md, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },

  // @group Styles > Viewer
  viewerSafe: { flex: 1, backgroundColor: COLORS.background },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: SPACING.sm,
  },
  viewerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerTitleArea: { flex: 1, alignItems: 'center' },
  viewerTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  viewerSubtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 1 },
  viewerContent: { flex: 1, backgroundColor: '#0a0e1a' },
  viewerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.xl,
  },
  viewerError: { fontSize: FONT_SIZE.md, color: COLORS.error, textAlign: 'center' },
  viewerHint: { fontSize: FONT_SIZE.md, color: COLORS.textMuted, textAlign: 'center' },
  viewerFooter: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  viewerFooterText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  logList: { flex: 1 },
  logListContent: { padding: SPACING.sm },
  logLineRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: 1 },
  logLineNumber: {
    width: 36,
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'right',
    paddingTop: 1,
    flexShrink: 0,
  },
  logLine: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#a8d8a8',
    lineHeight: 17,
  },
});
