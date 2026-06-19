export type Environment = 'dev' | 'qa' | 'staging' | 'production';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type AuthType = 'none' | 'bearer' | 'jwt' | 'oauth2' | 'basic' | 'custom';
export type ScenarioType = 'smoke' | 'load' | 'stress' | 'spike' | 'soak' | 'custom';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'archived';

export interface ServiceEnvironment {
  name: Environment;
  baseUrl: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  environments: ServiceEnvironment[];
  namespace?: string;
  tags: string[];
  authConfigId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthConfig {
  id: string;
  name: string;
  type: AuthType;
  loginEndpoint?: string;
  tokenHeaderName?: string;
  createdAt: string;
  updatedAt: string;
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

export interface Threshold {
  metric: string;
  condition: string;
}

export interface Stage {
  duration: string;
  target: number;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  type: ScenarioType;
  serviceId: string;
  environment: Environment;
  authConfigId?: string;
  vus: number;
  duration: string;
  stages?: Stage[];
  thresholds: Threshold[];
  requests: ScenarioRequest[];
  createdAt: string;
  updatedAt: string;
}

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

export interface Flow {
  id: string;
  name: string;
  description?: string;
  serviceId: string;
  environment: Environment;
  vus: number;
  duration: string;
  steps: FlowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionMetrics {
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

export interface Execution {
  id: string;
  name?: string;
  scenarioId?: string;
  flowId?: string;
  serviceId: string;
  environment: Environment;
  status: ExecutionStatus;
  runnerMode: 'docker' | 'kubernetes';
  startedAt?: string;
  completedAt?: string;
  metrics?: ExecutionMetrics;
  logs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  executionId: string;
  format: 'html' | 'json' | 'csv';
  filePath: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
