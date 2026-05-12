// @group BusinessLogic > Logs : Log viewer screen with process selector and real-time tail

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import * as Clipboard from 'expo-clipboard';
import { useProcesses } from '../hooks/useProcesses';
import { useLogs } from '../hooks/useLogs';
import { stripAnsi } from '../utils';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../utils/theme';
import type { PM2Process } from '../types';

// @group BusinessLogic > Logs > ProcessPicker : Dropdown modal for selecting a process
function ProcessPickerModal({
  visible,
  processes,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  processes: PM2Process[];
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Process</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close-outline" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {processes.map((p) => (
              <TouchableOpacity
                key={p.pm_id}
                style={[styles.pickerItem, selectedId === p.pm_id && styles.pickerItemActive]}
                onPress={() => { onSelect(p.pm_id, p.name); onClose(); }}
              >
                <View style={[styles.pickerDot, { backgroundColor: p.pm2_env.status === 'online' ? COLORS.success : COLORS.textMuted }]} />
                <Text style={[styles.pickerItemText, selectedId === p.pm_id && styles.pickerItemTextActive]}>
                  {p.name}
                </Text>
                <Text style={styles.pickerItemSub}>#{p.pm_id}</Text>
                {selectedId === p.pm_id && <Icon name="checkmark" size={16} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function LogsScreen(): React.JSX.Element {
  const { processes } = useProcesses();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState<string>('');
  const [logType, setLogType] = useState<'out' | 'err'>('out');
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [searchText, setSearchText] = useState('');
  const flatRef = useRef<FlatList>(null);

  const { lines, loading, error, clear, loadInitial } = useLogs(selectedId, logType, liveEnabled);

  // Auto-select first process when processes load
  useEffect(() => {
    if (selectedId === null && processes.length > 0) {
      setSelectedId(processes[0].pm_id);
      setSelectedName(processes[0].name);
    }
  }, [processes, selectedId]);

  // Auto-scroll on new live lines
  useEffect(() => {
    if (liveEnabled && lines.length > 0) {
      flatRef.current?.scrollToEnd({ animated: false });
    }
  }, [lines, liveEnabled]);

  const displayedLines = searchText
    ? lines.filter((l) => stripAnsi(l).toLowerCase().includes(searchText.toLowerCase()))
    : lines;

  async function copyLogs(): Promise<void> {
    await Clipboard.setStringAsync(lines.join('\n'));
    Alert.alert('Copied', `${lines.length} lines copied to clipboard`);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Logs</Text>
      </View>

      {/* Process selector */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.processPicker} onPress={() => setShowPicker(true)}>
          <View style={styles.processPickerLeft}>
            <Icon name="cube-outline" size={16} color={COLORS.primary} />
            <Text style={styles.processPickerText} numberOfLines={1}>
              {selectedName || 'Select process...'}
            </Text>
          </View>
          <Icon name="chevron-down" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Log type toggle */}
        <View style={styles.typeToggle}>
          {(['out', 'err'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, logType === t && styles.typeBtnActive]}
              onPress={() => setLogType(t)}
            >
              <Text style={[styles.typeBtnText, logType === t && styles.typeBtnTextActive]}>
                {t === 'out' ? 'stdout' : 'stderr'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Icon name="search-outline" size={14} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Filter logs..."
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Icon name="close-circle" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        <Text style={styles.lineCount}>{displayedLines.length} lines</Text>
      </View>

      {/* Log action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionBtn, liveEnabled && styles.actionBtnActive]}
          onPress={() => setLiveEnabled((v) => !v)}
        >
          <Icon name={liveEnabled ? 'radio-button-on' : 'radio-button-off'} size={13} color={liveEnabled ? COLORS.success : COLORS.textMuted} />
          <Text style={[styles.actionBtnText, { color: liveEnabled ? COLORS.success : COLORS.textMuted }]}>Live</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={loadInitial}>
          <Icon name="refresh-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.actionBtnText}>Reload</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={clear}>
          <Icon name="trash-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.actionBtnText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={copyLogs}>
          <Icon name="copy-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.actionBtnText}>Copy</Text>
        </TouchableOpacity>
        {liveEnabled && <View style={styles.liveDot} />}
      </View>

      {/* Log viewer */}
      {loading && displayedLines.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.stateText}>Loading logs...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Icon name="alert-circle-outline" size={32} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadInitial}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : selectedId === null ? (
        <View style={styles.centerState}>
          <Icon name="terminal-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.stateText}>Select a process to view logs</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={displayedLines}
          keyExtractor={(_, i) => String(i)}
          style={styles.logList}
          contentContainerStyle={styles.logListContent}
          renderItem={({ item }) => (
            <Text style={[styles.logLine, item.toLowerCase().includes('error') && styles.logLineError]}>
              {stripAnsi(item)}
            </Text>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyLog}>
              {searchText ? 'No matching log lines' : 'No log output yet'}
            </Text>
          }
        />
      )}

      <ProcessPickerModal
        visible={showPicker}
        processes={processes}
        selectedId={selectedId}
        onSelect={(id, name) => { setSelectedId(id); setSelectedName(name); }}
        onClose={() => setShowPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.textPrimary },
  controls: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  processPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 38,
  },
  processPickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  processPickerText: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, flex: 1 },
  typeToggle: { flexDirection: 'row', gap: 4 },
  typeBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 38,
    justifyContent: 'center',
  },
  typeBtnActive: { backgroundColor: `${COLORS.primary}20`, borderColor: `${COLORS.primary}50` },
  typeBtnText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '600' },
  typeBtnTextActive: { color: COLORS.primary },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    height: 36,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONT_SIZE.sm },
  lineCount: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    gap: 4,
  },
  actionBtn: {
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
  actionBtnActive: { borderColor: `${COLORS.success}40` },
  actionBtnText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: '500' },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.success,
    marginLeft: SPACING.xs,
  },
  logList: { flex: 1, backgroundColor: '#050d1a' },
  logListContent: { padding: SPACING.sm },
  logLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#b0d4b8',
    lineHeight: 17,
    paddingVertical: 0.5,
  },
  logLineError: { color: '#f87171' },
  emptyLog: {
    color: COLORS.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: FONT_SIZE.sm,
    padding: SPACING.xl,
    textAlign: 'center',
  },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  stateText: { fontSize: FONT_SIZE.md, color: COLORS.textMuted },
  errorText: { fontSize: FONT_SIZE.md, color: COLORS.error, textAlign: 'center', paddingHorizontal: SPACING.xl },
  retryBtn: {
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  retryBtnText: { color: COLORS.primary, fontWeight: '600' },
  // Process picker modal
  pickerOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerItemActive: { backgroundColor: `${COLORS.primary}10` },
  pickerDot: { width: 8, height: 8, borderRadius: RADIUS.full },
  pickerItemText: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: '500' },
  pickerItemTextActive: { color: COLORS.primary },
  pickerItemSub: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
});
