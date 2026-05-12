// @group Types : Core application type definitions and interfaces

// @group Types > PM2 : PM2 process data structures
export interface PM2ProcessMonit {
  memory: number;
  cpu: number;
}

export interface PM2ProcessEnv {
  pm_id: number;
  name: string;
  namespace: string;
  version?: string;
  pm_uptime: number;
  created_at: number;
  pm_cwd: string;
  pm_exec_path: string;
  exec_interpreter: string;
  exec_mode: 'fork_mode' | 'cluster_mode';
  instances: number;
  pm_out_log_path: string;
  pm_err_log_path: string;
  status: 'online' | 'stopping' | 'stopped' | 'launching' | 'errored';
  restart_time: number;
  unstable_restarts: number;
  autorestart: boolean;
  watch: boolean;
  env: Record<string, string>;
}

export interface PM2Process {
  pid: number;
  pm_id: number;
  name: string;
  monit: PM2ProcessMonit;
  pm2_env: PM2ProcessEnv;
}

export type ProcessAction = 'start' | 'stop' | 'restart' | 'delete';

// @group Types > Metrics : System and process metrics
export interface SystemMetrics {
  loadAvg: [number, number, number];
  memory: {
    total: number;
    free: number;
    used: number;
  };
  uptime: number;
  cpus: number;
}


export interface MetricsHistoryEntry {
  timestamp: number;
  cpu: number;
  memory: number;
}

// @group Types > Auth : Authentication data structures
export interface AuthStatus {
  passwordSet: boolean;
  pinSet: boolean;
  autoLockMinutes: number;
}

export interface AuthVerifyResponse {
  success: boolean;
  token?: string;
  message?: string;
  error?: string;
}

// @group Types > CronJobs : Cron job data structures
export interface CronJob {
  id: string;
  name: string;
  cronExpression: string;
  scriptType: 'node' | 'shell' | 'python';
  scriptPath: string;
  enabled: boolean;
  status: 'idle' | 'running' | 'error';
  lastRun?: string;
  nextRun?: string;
  args?: string;
  cwd?: string;
}

export interface CreateCronJobPayload {
  name: string;
  cronExpression: string;
  scriptType: 'node' | 'shell' | 'python';
  scriptPath: string;
  args?: string;
  cwd?: string;
}

// @group Types > Remote : Remote connection data structures
export interface RemoteConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  connected: boolean;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
}

export interface RemoteSystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  pm2Version: string;
  uptime: number;
  memory: {
    total: number;
    free: number;
    used: number;
  };
}

// @group Types > Deploy : Deployment data structures
export interface DeployPayload {
  appPath: string;
  name: string;
  script: string;
  instances: number;
  execMode: 'fork' | 'cluster';
  envVars: Record<string, string>;
}

export interface EnvVar {
  key: string;
  value: string;
}

// @group Types > Modules : PM2 module data structures
export interface PM2Module {
  name: string;
  version: string;
  description?: string;
  status: 'online' | 'stopped' | 'errored';
}

// @group Types > Cluster : Cluster management data structures
export interface ClusterInfo {
  id: number;
  name: string;
  instances: PM2Process[];
  execMode: 'fork_mode' | 'cluster_mode';
  totalInstances: number;
}

// @group Types > LogFiles : Log file browser data structures
export interface LogFileInfo {
  path: string;
  size: number;
  modified: number;
  type: 'out' | 'err' | 'rotated';
  name: string;
}

// @group Types > Navigation : React Navigation type definitions
export type RootStackParamList = {
  ServerSetup: undefined;
  Auth: undefined;
  Main: undefined;
};

export type DashboardStackParamList = {
  Dashboard: undefined;
  ProcessDetail: { process: PM2Process };
  Cluster: { process: PM2Process };
  LogFiles: { processId: number; processName: string };
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Remote: undefined;
  Deploy: undefined;
  Modules: undefined;
  Settings: undefined;
  MetricsHistory: undefined;
};

export type MainTabParamList = {
  DashboardTab: undefined;
  MetricsTab: undefined;
  LogsTab: undefined;
  CronTab: undefined;
  MoreTab: undefined;
};

// @group Types > Config : App configuration
export interface AppConfig {
  serverUrl: string;
  authToken?: string;
  refreshInterval: number;
  theme: 'dark' | 'light';
}

// @group Types > API : API response wrappers
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}
