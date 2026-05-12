// @group BusinessLogic > Hooks : Real-time socket connection status hook

import { useState, useEffect } from 'react';
import { socketManager } from '../services/socket';

export type ConnectionStatus = 'connected' | 'disconnected';

interface UseConnectionStatusResult {
  status: ConnectionStatus;
  isConnected: boolean;
}

// @group BusinessLogic > Hooks > ConnectionStatus : Tracks live socket connection state
export function useConnectionStatus(): UseConnectionStatusResult {
  const [status, setStatus] = useState<ConnectionStatus>(
    socketManager.isConnected() ? 'connected' : 'disconnected'
  );

  useEffect(() => {
    const unsubConnect = socketManager.onConnect(() => setStatus('connected'));
    const unsubDisconnect = socketManager.onDisconnect(() => setStatus('disconnected'));

    // Sync with current state on mount
    setStatus(socketManager.isConnected() ? 'connected' : 'disconnected');

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, []);

  return { status, isConnected: status === 'connected' };
}
