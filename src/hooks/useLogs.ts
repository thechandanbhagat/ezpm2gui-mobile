// @group BusinessLogic > Hooks : Custom hook for log streaming via Socket.IO

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchLogs } from '../services/api';
import { socketManager } from '../services/socket';

const MAX_LOG_LINES = 500;

interface UseLogsResult {
  lines: string[];
  loading: boolean;
  error: string | null;
  clear: () => void;
  loadInitial: () => Promise<void>;
}

export function useLogs(
  processId: number | null,
  logType: 'out' | 'err',
  liveEnabled: boolean
): UseLogsResult {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liveRef = useRef(liveEnabled);
  liveRef.current = liveEnabled;

  const loadInitial = useCallback(async () => {
    if (processId === null) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLogs(processId, logType, 200);
      setLines(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [processId, logType]);

  useEffect(() => {
    if (processId === null) return;
    loadInitial();
  }, [loadInitial, processId, logType]);

  useEffect(() => {
    if (processId === null || !liveEnabled) return;

    const unsub = socketManager.subscribeToLogs(processId, logType, (line) => {
      setLines((prev) => {
        const next = [...prev, line];
        return next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next;
      });
    });

    return unsub;
  }, [processId, logType, liveEnabled]);

  const clear = useCallback(() => setLines([]), []);

  return { lines, loading, error, clear, loadInitial };
}
