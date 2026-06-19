import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { config } from '../config/index.js';

const execFileAsync = promisify(execFile);

export interface K8sRunOptions {
  executionId: string;
  scriptContent: string;
  baseUrl: string;
  vus: number;
  duration: string;
}

/**
 * Kubernetes-based k6 runner.
 * Creates a ConfigMap with the test script and a Job that runs k6.
 * Requires kubectl configured to reach the k3s cluster.
 *
 * This runner is OPTIONAL and must be enabled via RUNNER_MODE=kubernetes.
 */
export class KubernetesRunner {
  private namespace: string;

  constructor() {
    this.namespace = config.K8S_NAMESPACE;
  }

  async run(opts: K8sRunOptions): Promise<{ jobName: string }> {
    const jobName = `k6-${opts.executionId.slice(0, 8)}`;
    const configMapName = `k6-script-${opts.executionId.slice(0, 8)}`;

    await this.applyManifest(this.buildConfigMap(configMapName, opts.scriptContent));
    await this.applyManifest(
      this.buildJob(jobName, configMapName, opts.baseUrl, opts.vus, opts.duration),
    );

    return { jobName };
  }

  async cancel(jobName: string): Promise<void> {
    await execFileAsync('kubectl', [
      'delete', 'job', jobName,
      '-n', this.namespace,
      '--ignore-not-found',
    ]).catch(() => undefined);
  }

  async getJobStatus(jobName: string): Promise<'running' | 'completed' | 'failed' | 'unknown'> {
    try {
      const { stdout } = await execFileAsync('kubectl', [
        'get', 'job', jobName,
        '-n', this.namespace,
        '-o', 'jsonpath={.status}',
      ]);
      const status = JSON.parse(stdout);
      if (status.succeeded > 0) return 'completed';
      if (status.failed > 0) return 'failed';
      if (status.active > 0) return 'running';
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async getLogs(jobName: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync('kubectl', [
        'logs', `job/${jobName}`,
        '-n', this.namespace,
        '--tail=500',
      ]);
      return stdout;
    } catch {
      return '';
    }
  }

  private buildConfigMap(name: string, scriptContent: string): object {
    return {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name,
        namespace: this.namespace,
        labels: { 'app.kubernetes.io/managed-by': 'perf-platform' },
      },
      data: {
        'test.js': scriptContent,
      },
    };
  }

  private buildJob(
    name: string,
    configMapName: string,
    baseUrl: string,
    _vus: number,
    _duration: string,
  ): object {
    return {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name,
        namespace: this.namespace,
        labels: { 'app.kubernetes.io/managed-by': 'perf-platform' },
      },
      spec: {
        ttlSecondsAfterFinished: 600,
        template: {
          metadata: {
            labels: { app: 'k6-runner', job: name },
          },
          spec: {
            restartPolicy: 'Never',
            containers: [
              {
                name: 'k6',
                image: config.K6_IMAGE,
                args: ['run', '--out', 'experimental-prometheus-rw', '/scripts/test.js'],
                env: [
                  { name: 'BASE_URL', value: baseUrl },
                  {
                    name: 'K6_PROMETHEUS_RW_SERVER_URL',
                    value: config.K6_PROMETHEUS_RW_SERVER_URL,
                  },
                  {
                    name: 'K6_PROMETHEUS_RW_TREND_STATS',
                    value: 'p(50),p(90),p(95),p(99),avg,min,max',
                  },
                ],
                volumeMounts: [
                  { name: 'scripts', mountPath: '/scripts', readOnly: true },
                ],
                resources: {
                  requests: { cpu: '100m', memory: '128Mi' },
                  limits: { cpu: '500m', memory: '512Mi' },
                },
              },
            ],
            volumes: [
              {
                name: 'scripts',
                configMap: { name: configMapName },
              },
            ],
          },
        },
      },
    };
  }

  private async applyManifest(manifest: object): Promise<void> {
    const tmpFile = path.join('/tmp', `k8s-manifest-${Date.now()}.json`);
    await fs.writeFile(tmpFile, JSON.stringify(manifest), 'utf8');
    try {
      await execFileAsync('kubectl', ['apply', '-f', tmpFile]);
    } finally {
      await fs.unlink(tmpFile).catch(() => undefined);
    }
  }
}
