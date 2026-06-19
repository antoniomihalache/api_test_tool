// ── Shared domain types ──────────────────────────────────────

export type Environment = 'dev' | 'qa' | 'staging' | 'production';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type AuthType = 'none' | 'bearer' | 'jwt' | 'oauth2' | 'basic' | 'custom';

export type ScenarioType = 'smoke' | 'load' | 'stress' | 'spike' | 'soak' | 'custom';

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'archived';

export type RunnerMode = 'docker' | 'kubernetes';

// ── Service ──────────────────────────────────────────────────

export interface ServiceEnvironment {
  name: Environment;
  baseUrl: string;
}

export interface IService {
  id: string;
  name: string;
  description?: string;
  environments: ServiceEnvironment[];
  namespace?: string;
  tags: string[];
  authConfigId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Authentication ────────────────────────────────────────────

export interface AuthConfig {
  id: string;
  name: string;
  type: AuthType;
  loginEndpoint?: string;
  loginHeaders?: Record<string, string>;
  loginBody?: Record<string, unknown>;
  tokenExtractPath?: string;
  tokenHeaderName?: string;
  refreshEndpoint?: string;
  refreshTokenPath?: string;
  staticToken?: string;
  username?: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Scenario ──────────────────────────────────────────────────

export interface ThresholdConfig {
  metric: string;
  condition: string;
}

export interface StageConfig {
  duration: string;
  target: number;
}

export interface RequestAssertion {
  type: 'status' | 'latency' | 'body' | 'header';
  operator: 'eq' | 'lt' | 'gt' | 'contains';
  value: string | number;
}

export interface ScenarioRequest {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  body?: string;
  assertions: RequestAssertion[];
}

export interface IScenario {
  id: string;
  name: string;
  description?: string;
  type: ScenarioType;
  serviceId: string;
  environment: Environment;
  authConfigId?: string;
  vus: number;
  duration: string;
  stages?: StageConfig[];
  thresholds: ThresholdConfig[];
  requests: ScenarioRequest[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Flow ──────────────────────────────────────────────────────

export interface FlowStep {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  body?: string;
  extractVars?: Array<{ name: string; jsonPath: string }>;
  assertions: RequestAssertion[];
  condition?: string;
}

export interface IFlow {
  id: string;
  name: string;
  description?: string;
  serviceId: string;
  environment: Environment;
  authConfigId?: string;
  vus: number;
  duration: string;
  steps: FlowStep[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Execution ─────────────────────────────────────────────────

export interface ExecutionMetricsSummary {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
  rps: number;
  totalRequests: number;
  errorRate: number;
  successRate: number;
}

export interface IExecution {
  id: string;
  name?: string;
  scenarioId?: string;
  flowId?: string;
  serviceId: string;
  environment: Environment;
  status: ExecutionStatus;
  runnerMode: RunnerMode;
  containerId?: string;
  k8sJobName?: string;
  startedAt?: Date;
  completedAt?: Date;
  metrics?: ExecutionMetricsSummary;
  reportPath?: string;
  logs: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Metrics ───────────────────────────────────────────────────

export interface MetricPoint {
  executionId: string;
  timestamp: Date;
  metricName: string;
  value: number;
  tags?: Record<string, string>;
}

// ── Report ────────────────────────────────────────────────────

export type ReportFormat = 'html' | 'json' | 'csv';

export interface IReport {
  id: string;
  executionId: string;
  format: ReportFormat;
  filePath: string;
  createdAt: Date;
}

// ── API ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
