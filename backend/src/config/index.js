import dotenv from 'dotenv';
dotenv.config();

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/perf_platform'),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('24h'),
  RUNNER_MODE: z.enum(['docker', 'kubernetes']).default('docker'),
  DOCKER_SOCKET: z.string().default('/var/run/docker.sock'),
  K6_IMAGE: z.string().default('grafana/k6:0.54.0'),
  K6_SCRIPTS_PATH: z.string().default('/tmp/k6-scripts'),
  K6_PROMETHEUS_RW_SERVER_URL: z.string().default('http://prometheus:9090/api/v1/write'),
  KUBECONFIG: z.string().optional(),
  K8S_NAMESPACE: z.string().default('perf-tests'),
  PROMETHEUS_URL: z.string().default('http://prometheus:9090'),
  BACKEND_API_URL: z.string().default('http://localhost:4000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
  REPORTS_PATH: z.string().default('/app/reports'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
