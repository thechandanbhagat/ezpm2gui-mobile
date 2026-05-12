// @group Utilities : Application-wide helper and formatting functions

// @group Utilities > Formatting : Data formatting helpers
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatSystemUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatCpu(cpu: number): string {
  return `${cpu.toFixed(1)}%`;
}

export function formatMemoryPercent(used: number, total: number): string {
  if (total === 0) return '0%';
  return `${((used / total) * 100).toFixed(1)}%`;
}

export function formatLoadAvg(load: number): string {
  return load.toFixed(2);
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// @group Utilities > Status : Process status helpers
export type ProcessStatus = 'online' | 'stopping' | 'stopped' | 'launching' | 'errored';

export function getStatusColor(status: ProcessStatus): string {
  const map: Record<ProcessStatus, string> = {
    online: '#22c55e',
    launching: '#3b82f6',
    stopping: '#f59e0b',
    stopped: '#94a3b8',
    errored: '#ef4444',
  };
  return map[status] ?? '#94a3b8';
}

export function getStatusLabel(status: ProcessStatus): string {
  const map: Record<ProcessStatus, string> = {
    online: 'Online',
    launching: 'Launching',
    stopping: 'Stopping',
    stopped: 'Stopped',
    errored: 'Errored',
  };
  return map[status] ?? status;
}

// @group Utilities > Validation : Input validation helpers
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidCronExpression(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  return parts.length === 5 || parts.length === 6;
}

// @group Utilities > String : String manipulation helpers
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen - 3)}...`;
}

export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

export function buildServerUrl(base: string): string {
  return base.replace(/\/$/, '');
}
