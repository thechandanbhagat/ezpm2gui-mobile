// @group BusinessLogic > Socket : Socket.IO client service for real-time updates

import { io, Socket } from 'socket.io-client';
import { getServerUrl, getAuthToken, clearAuthToken } from './config';
import { forceAuthScreen } from '../navigation/navigationRef';
import type { PM2Process, SystemMetrics } from '../types';

// @group Types : Socket event callback types
type ProcessUpdateCallback = (processes: PM2Process[]) => void;
type MetricsUpdateCallback = (metrics: SystemMetrics) => void;
type LogDataCallback = (line: string) => void;
type ConnectionCallback = () => void;

// @group BusinessLogic > Socket > Manager : Singleton socket manager
class SocketManager {
  private socket: Socket | null = null;
  private processUpdateListeners: Set<ProcessUpdateCallback> = new Set();
  private metricsUpdateListeners: Set<MetricsUpdateCallback> = new Set();
  private logListeners: Map<string, Set<LogDataCallback>> = new Map();
  private connectListeners: Set<ConnectionCallback> = new Set();
  private disconnectListeners: Set<ConnectionCallback> = new Set();

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const url = await getServerUrl();
    const token = await getAuthToken();

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      this.connectListeners.forEach((cb) => cb());
    });

    this.socket.on('disconnect', () => {
      this.disconnectListeners.forEach((cb) => cb());
    });

    // Auth rejection: the server refuses the handshake when the token is
    // missing/expired/revoked. Drop the token and bounce to the login screen
    // instead of retrying forever with a dead token.
    this.socket.on('connect_error', (err: Error) => {
      const message = (err?.message || '').toLowerCase();
      if (message.includes('auth') || message.includes('unauthorized') || message.includes('token')) {
        this.disconnect();
        clearAuthToken().catch(() => {});
        forceAuthScreen('Your session expired. Please sign in again.');
      }
    });

    this.socket.on('processes', (processes: PM2Process[]) => {
      this.processUpdateListeners.forEach((cb) => cb(processes));
    });

    this.socket.on('metrics', (metrics: SystemMetrics) => {
      this.metricsUpdateListeners.forEach((cb) => cb(metrics));
    });

    this.socket.on('log:data', (payload: { processId: number; type: string; line: string }) => {
      const key = `${payload.processId}:${payload.type}`;
      const listeners = this.logListeners.get(key);
      if (listeners) {
        listeners.forEach((cb) => cb(payload.line));
      }
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // @group BusinessLogic > Socket > Subscriptions : Event subscription management
  onConnect(cb: ConnectionCallback): () => void {
    this.connectListeners.add(cb);
    return () => this.connectListeners.delete(cb);
  }

  onDisconnect(cb: ConnectionCallback): () => void {
    this.disconnectListeners.add(cb);
    return () => this.disconnectListeners.delete(cb);
  }

  onProcessUpdate(cb: ProcessUpdateCallback): () => void {
    this.processUpdateListeners.add(cb);
    return () => this.processUpdateListeners.delete(cb);
  }

  onMetricsUpdate(cb: MetricsUpdateCallback): () => void {
    this.metricsUpdateListeners.add(cb);
    return () => this.metricsUpdateListeners.delete(cb);
  }

  // @group BusinessLogic > Socket > Logs : Log streaming subscription
  subscribeToLogs(processId: number, type: 'out' | 'err', cb: LogDataCallback): () => void {
    const key = `${processId}:${type}`;
    if (!this.logListeners.has(key)) {
      this.logListeners.set(key, new Set());
    }
    this.logListeners.get(key)!.add(cb);
    this.socket?.emit('log:subscribe', { processId, type });

    return () => {
      const listeners = this.logListeners.get(key);
      if (listeners) {
        listeners.delete(cb);
        if (listeners.size === 0) {
          this.logListeners.delete(key);
          this.socket?.emit('log:unsubscribe', { processId, type });
        }
      }
    };
  }
}

// @group Exports : Singleton socket manager instance
export const socketManager = new SocketManager();
