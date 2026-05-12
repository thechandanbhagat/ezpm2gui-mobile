// @group BusinessLogic > Hooks : Custom hook for PM2 process data with real-time updates

import { useState, useEffect, useCallback } from 'react';
import { fetchProcesses } from '../services/api';
import { socketManager } from '../services/socket';
import type { PM2Process } from '../types';

interface UseProcessesResult {
  processes: PM2Process[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProcesses(): UseProcessesResult {
  const [processes, setProcesses] = useState<PM2Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchProcesses();
      setProcesses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load processes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Subscribe to real-time socket updates
    const unsub = socketManager.onProcessUpdate((updated) => {
      setProcesses(updated);
      setLoading(false);
    });

    return unsub;
  }, [load]);

  return { processes, loading, error, refresh: load };
}
