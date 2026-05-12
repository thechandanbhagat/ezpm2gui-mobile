// @group BusinessLogic > Hooks : Custom hook for system metrics with real-time updates

import { useState, useEffect, useCallback } from 'react';
import { fetchMetrics, fetchMetricsHistory } from '../services/api';
import { socketManager } from '../services/socket';
import type { SystemMetrics, MetricsHistoryEntry } from '../types';

interface UseMetricsResult {
  metrics: SystemMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMetrics(): UseMetricsResult {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const unsub = socketManager.onMetricsUpdate((updated) => {
      setMetrics(updated);
      setLoading(false);
    });

    return unsub;
  }, [load]);

  return { metrics, loading, error, refresh: load };
}

interface UseMetricsHistoryResult {
  history: MetricsHistoryEntry[];
  loading: boolean;
  error: string | null;
}

export function useMetricsHistory(processId: number | string): UseMetricsHistoryResult {
  const [history, setHistory] = useState<MetricsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMetricsHistory(processId)
      .then((data) => {
        if (!cancelled) {
          setHistory(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load history');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [processId]);

  return { history, loading, error };
}
