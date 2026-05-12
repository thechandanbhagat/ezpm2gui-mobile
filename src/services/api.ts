// @group APIEndpoints : Axios-based API service layer for all backend communication

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getServerUrl, getAuthToken } from './config';
import type {
  PM2Process,
  SystemMetrics,
  MetricsHistoryEntry,
  AuthStatus,
  AuthVerifyResponse,
  CronJob,
  CreateCronJobPayload,
  RemoteConnection,
  RemoteSystemInfo,
  DeployPayload,
  PM2Module,
  ClusterInfo,
  LogFileInfo,
} from '../types';

// @group Configuration : Axios instance factory
let _instance: AxiosInstance | null = null;

async function getInstance(): Promise<AxiosInstance> {
  const baseURL = await getServerUrl();
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  _instance = axios.create({ baseURL, headers, timeout: 15000 });
  return _instance;
}

async function get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  const client = await getInstance();
  const res = await client.get<T>(path, config);
  return res.data;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const client = await getInstance();
  const res = await client.post<T>(path, body);
  return res.data;
}

async function del<T>(path: string): Promise<T> {
  const client = await getInstance();
  const res = await client.delete<T>(path);
  return res.data;
}

// @group APIEndpoints > Auth : Authentication endpoints
export async function checkAuthStatus(): Promise<AuthStatus> {
  return get<AuthStatus>('/api/auth/status');
}

export async function verifyPassword(password: string): Promise<AuthVerifyResponse> {
  return post<AuthVerifyResponse>('/api/auth/verify', { password });
}

export async function verifyPin(pin: string): Promise<AuthVerifyResponse> {
  return post<AuthVerifyResponse>('/api/auth/pin/verify', { pin });
}

// @group APIEndpoints > Processes : PM2 process management endpoints
export async function fetchProcesses(): Promise<PM2Process[]> {
  return get<PM2Process[]>('/api/processes');
}

export async function processAction(
  id: number | string,
  action: 'start' | 'stop' | 'restart' | 'delete'
): Promise<void> {
  await post(`/api/process/${id}/${action}`);
}

// @group APIEndpoints > Metrics : System and process metrics endpoints
export async function fetchMetrics(): Promise<SystemMetrics> {
  return get<SystemMetrics>('/api/metrics');
}

export async function fetchMetricsHistory(processId: number | string): Promise<MetricsHistoryEntry[]> {
  return get<MetricsHistoryEntry[]>(`/api/metrics/history/${processId}`);
}

// @group APIEndpoints > Logs : Log retrieval endpoints
export async function fetchLogs(
  id: number | string,
  type: 'out' | 'err',
  lines = 200
): Promise<string[]> {
  return get<string[]>(`/api/logs/${id}/${type}`, { params: { lines } });
}

export async function fetchLogFiles(id: number | string): Promise<LogFileInfo[]> {
  return get<LogFileInfo[]>(`/api/log-files/${id}`);
}

export async function fetchLogFileContents(path: string, lines = 500): Promise<string[]> {
  return get<string[]>('/api/log-file', { params: { path, lines } });
}

export async function fetchSystemMetricsHistory(): Promise<MetricsHistoryEntry[]> {
  return get<MetricsHistoryEntry[]>('/api/metrics/history');
}

// @group APIEndpoints > CronJobs : Cron job management endpoints
export async function fetchCronJobs(): Promise<CronJob[]> {
  const res = await get<CronJob[] | { success: boolean; data: CronJob[] }>('/api/cron-jobs/status');
  // Server wraps response in { success, data } — unwrap if needed
  return Array.isArray(res) ? res : (res as any).data ?? [];
}

export async function createCronJob(payload: CreateCronJobPayload): Promise<CronJob> {
  return post<CronJob>('/api/cron-jobs', payload);
}

export async function toggleCronJob(id: string): Promise<void> {
  await post(`/api/cron-jobs/${id}/toggle`);
}

export async function startCronJob(id: string): Promise<void> {
  await post(`/api/cron-jobs/${id}/start`);
}

export async function stopCronJob(id: string): Promise<void> {
  await post(`/api/cron-jobs/${id}/stop`);
}

export async function deleteCronJob(id: string): Promise<void> {
  await del(`/api/cron-jobs/${id}`);
}

// @group APIEndpoints > Remote : Remote connection management endpoints
export async function fetchRemoteConnections(): Promise<RemoteConnection[]> {
  return get<RemoteConnection[]>('/api/remote/connections');
}

export async function connectRemote(id: string): Promise<void> {
  await post(`/api/remote/${id}/connect`);
}

export async function disconnectRemote(id: string): Promise<void> {
  await post(`/api/remote/${id}/disconnect`);
}

export async function fetchRemoteProcesses(id: string): Promise<PM2Process[]> {
  return get<PM2Process[]>(`/api/remote/${id}/processes`);
}

export async function fetchRemoteSystemInfo(id: string): Promise<RemoteSystemInfo> {
  return get<RemoteSystemInfo>(`/api/remote/${id}/system-info`);
}

// @group APIEndpoints > Modules : PM2 module management endpoints
export async function fetchModules(): Promise<PM2Module[]> {
  return get<PM2Module[]>('/api/modules');
}

export async function installModule(name: string): Promise<void> {
  await post('/api/modules/install', { name });
}

export async function uninstallModule(name: string): Promise<void> {
  await del(`/api/modules/${name}`);
}

// @group APIEndpoints > Cluster : Cluster management endpoints
export async function fetchClusterInfo(id: number | string): Promise<ClusterInfo> {
  return get<ClusterInfo>(`/api/cluster/${id}`);
}

export async function scaleCluster(id: number | string, instances: number): Promise<void> {
  await post(`/api/cluster/${id}/scale`, { instances });
}

export async function reloadCluster(id: number | string): Promise<void> {
  await post(`/api/cluster/${id}/reload`);
}

export async function switchExecMode(
  id: number | string,
  mode: 'fork' | 'cluster'
): Promise<void> {
  await post(`/api/cluster/${id}/exec-mode`, { mode });
}

// @group APIEndpoints > Deploy : Application deployment endpoint
export async function deployApplication(
  payload: DeployPayload,
  onProgress: (line: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const baseURL = await getServerUrl();
  const token = await getAuthToken();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(`${baseURL}/api/deploy`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      onError(`HTTP ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      onError('No response body');
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          onProgress(trimmed.slice(5).trim());
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Deploy failed');
  }
}

// @group Utilities > Connectivity : Connection test helper — full diagnostic log + actionable error
export async function testConnection(url: string): Promise<{ ok: boolean; error?: string }> {
  const target = `${url.replace(/\/$/, '')}/api/auth/status`;

  console.log('[testConnection] target:', target);

  try {
    const res = await axios.get(target, { timeout: 8000 });

    console.log('[testConnection] status:', res.status);
    console.log('[testConnection] headers:', JSON.stringify(res.headers));
    console.log('[testConnection] data:', JSON.stringify(res.data));

    if (typeof res.data === 'string' && res.data.trim().startsWith('<')) {
      return { ok: false, error: 'Server returned HTML instead of JSON.\nThe URL may point to the wrong path or server.' };
    }
    return { ok: res.status < 400 };
  } catch (err: any) {
    // Dump everything available for diagnosis
    console.log('[testConnection] ERROR');
    console.log('  message :', err?.message);
    console.log('  code    :', err?.code);
    console.log('  name    :', err?.name);
    console.log('  isAxios :', axios.isAxiosError(err));
    if (axios.isAxiosError(err)) {
      console.log('  response.status  :', err.response?.status);
      console.log('  response.headers :', JSON.stringify(err.response?.headers));
      console.log('  response.data    :', JSON.stringify(err.response?.data));
      console.log('  request.url      :', err.config?.url);
      console.log('  request.method   :', err.config?.method);
      console.log('  request.timeout  :', err.config?.timeout);
    }
    console.log('  stack:', err?.stack);

    const code: string = err?.code ?? '';
    const msg: string  = err?.message ?? '';

    // Build a verbose on-screen message so the user can see exactly what failed
    const detail = [
      `URL: ${target}`,
      `Error: ${msg || '(none)'}`,
      err?.code ? `Code: ${err.code}` : null,
      err.response ? `HTTP ${err.response.status}` : null,
    ].filter(Boolean).join('\n');

    if (code === 'ECONNREFUSED') {
      return { ok: false, error: `Connection refused — server is not running or wrong port.\n\n${detail}` };
    }
    if (code === 'ECONNABORTED' || msg.toLowerCase().includes('timeout')) {
      return { ok: false, error: `Timed out — wrong IP or port ${new URL(url).port || '3101'} is firewalled.\n\n${detail}` };
    }
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
      return { ok: false, error: `Host not found — check the IP and that both devices are on the same network.\n\n${detail}` };
    }
    if (msg === 'Network Error' || code === 'ERR_NETWORK') {
      return { ok: false, error: `Network Error — Android may be blocking plain HTTP.\nRebuild the APK after the cleartext traffic fix.\n\n${detail}` };
    }
    return { ok: false, error: `${msg || 'Connection failed'}\n\n${detail}` };
  }
}
