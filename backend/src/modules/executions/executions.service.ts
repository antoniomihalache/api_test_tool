import { ExecutionModel } from './executions.model.js';
import { ServiceModel } from '../services/services.model.js';
import { ScenarioModel } from '../scenarios/scenarios.model.js';
import { FlowModel } from '../flows/flows.model.js';
import { AuthConfigModel } from '../auth/auth.model.js';
import { DockerRunner } from '../../runner/docker-runner.js';
import { KubernetesRunner } from '../../runner/k8s-runner.js';
import { K6Generator } from '../../generator/k6-generator.js';
import { createError } from '../../middleware/error.middleware.js';
import { config } from '../../config/index.js';
import { IExecution, AuthConfig } from '../../types/index.js';

const generator = new K6Generator();
const dockerRunner = new DockerRunner();
const k8sRunner = new KubernetesRunner();

export interface StartExecutionInput {
  scenarioId?: string;
  flowId?: string;
  name?: string;
}

export class ExecutionsService {
  async list(filters: { status?: string; serviceId?: string; limit?: number }): Promise<IExecution[]> {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.serviceId) query.serviceId = filters.serviceId;
    return ExecutionModel.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit ?? 50)
      .lean<IExecution[]>();
  }

  async getById(id: string): Promise<IExecution> {
    const execution = await ExecutionModel.findById(id).lean<IExecution>();
    if (!execution) throw createError('Execution not found', 404);
    return execution;
  }

  async start(input: StartExecutionInput): Promise<IExecution> {
    if (!input.scenarioId && !input.flowId) {
      throw createError('scenarioId or flowId is required', 400);
    }

    let serviceId: string;
    let environment: string;
    let authConfigId: string | undefined;
    let scriptContent: string;
    let baseUrl: string;

    if (input.scenarioId) {
      const scenario = await ScenarioModel.findById(input.scenarioId).lean();
      if (!scenario) throw createError('Scenario not found', 404);
      serviceId = String(scenario.serviceId);
      environment = scenario.environment;
      authConfigId = scenario.authConfigId ? String(scenario.authConfigId) : undefined;

      const service = await ServiceModel.findById(serviceId).lean();
      if (!service) throw createError('Service not found', 404);
      const envConfig = service.environments.find((e) => e.name === environment);
      if (!envConfig) throw createError(`No ${environment} environment configured for service`, 400);
      baseUrl = envConfig.baseUrl;

      let authConfig: AuthConfig | undefined;
      if (authConfigId) {
        authConfig = (await AuthConfigModel.findById(authConfigId).lean()) as AuthConfig | undefined;
      }

      scriptContent = generator.generateScript(scenario as never, {
        baseUrl,
        authConfig,
        prometheusRwUrl: config.K6_PROMETHEUS_RW_SERVER_URL,
      });
    } else {
      const flow = await FlowModel.findById(input.flowId).lean();
      if (!flow) throw createError('Flow not found', 404);
      serviceId = String(flow.serviceId);
      environment = flow.environment;
      authConfigId = flow.authConfigId ? String(flow.authConfigId) : undefined;

      const service = await ServiceModel.findById(serviceId).lean();
      if (!service) throw createError('Service not found', 404);
      const envConfig = service.environments.find((e) => e.name === environment);
      if (!envConfig) throw createError(`No ${environment} environment configured`, 400);
      baseUrl = envConfig.baseUrl;

      let authConfig: AuthConfig | undefined;
      if (authConfigId) {
        authConfig = (await AuthConfigModel.findById(authConfigId).lean()) as AuthConfig | undefined;
      }

      scriptContent = generator.generateFlowScript(flow as never, {
        baseUrl,
        authConfig,
        prometheusRwUrl: config.K6_PROMETHEUS_RW_SERVER_URL,
      });
    }

    const execution = await ExecutionModel.create({
      name: input.name,
      scenarioId: input.scenarioId,
      flowId: input.flowId,
      serviceId,
      environment,
      status: 'pending',
      runnerMode: config.RUNNER_MODE,
      logs: [],
    });

    const executionId = String(execution._id);

    // Fire-and-forget: run in background, update status in DB
    this.runAsync(executionId, scriptContent, baseUrl).catch((err) => {
      console.error(`Execution ${executionId} background error:`, err);
    });

    return execution.toObject() as unknown as IExecution;
  }

  private async runAsync(executionId: string, scriptContent: string, baseUrl: string): Promise<void> {
    await ExecutionModel.findByIdAndUpdate(executionId, {
      status: 'running',
      startedAt: new Date(),
    });

    try {
      const logs: string[] = [];

      if (config.RUNNER_MODE === 'docker') {
        const result = await dockerRunner.run(
          { executionId, scriptContent, baseUrl },
          (line) => {
            logs.push(line.trim());
            // Persist log batches periodically
            if (logs.length % 20 === 0) {
              ExecutionModel.findByIdAndUpdate(executionId, { $push: { logs: { $each: logs.slice(-20) } } }).exec();
            }
          },
        );

        const finalStatus = result.exitCode === 0 ? 'completed' : 'failed';
        const summary = this.parseK6Output(result.stdout);

        await ExecutionModel.findByIdAndUpdate(executionId, {
          status: finalStatus,
          completedAt: new Date(),
          containerId: result.containerId,
          metrics: summary,
          logs: logs.slice(-500), // Keep last 500 lines
        });
      } else {
        // Kubernetes mode
        const { jobName } = await k8sRunner.run({
          executionId,
          scriptContent,
          baseUrl,
          vus: 10,
          duration: '5m',
        });

        await ExecutionModel.findByIdAndUpdate(executionId, { k8sJobName: jobName });

        // Poll for completion (simplified - production would use watch)
        let attempts = 0;
        const maxAttempts = 120; // 10 minutes
        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 5000));
          const jobStatus = await k8sRunner.getJobStatus(jobName);
          if (jobStatus === 'completed' || jobStatus === 'failed') {
            const jobLogs = await k8sRunner.getLogs(jobName);
            const summary = this.parseK6Output(jobLogs);
            await ExecutionModel.findByIdAndUpdate(executionId, {
              status: jobStatus,
              completedAt: new Date(),
              metrics: summary,
              logs: jobLogs.split('\n').slice(-500),
            });
            break;
          }
          attempts++;
        }
      }
    } catch (err) {
      await ExecutionModel.findByIdAndUpdate(executionId, {
        status: 'failed',
        completedAt: new Date(),
        logs: [(err as Error).message],
      });
    }
  }

  async cancel(id: string): Promise<IExecution> {
    const execution = await ExecutionModel.findById(id).lean<IExecution>();
    if (!execution) throw createError('Execution not found', 404);
    if (execution.status !== 'running') throw createError('Execution is not running', 400);

    if (execution.containerId) {
      await dockerRunner.cancel(execution.containerId);
    }
    if (execution.k8sJobName) {
      await k8sRunner.cancel(execution.k8sJobName);
    }

    const updated = await ExecutionModel.findByIdAndUpdate(
      id,
      { status: 'cancelled', completedAt: new Date() },
      { new: true },
    ).lean<IExecution>();

    return updated!;
  }

  async archive(id: string): Promise<IExecution> {
    const updated = await ExecutionModel.findByIdAndUpdate(
      id,
      { status: 'archived' },
      { new: true },
    ).lean<IExecution>();
    if (!updated) throw createError('Execution not found', 404);
    return updated;
  }

  private parseK6Output(output: string): Record<string, number> {
    const metrics: Record<string, number> = {};

    const patterns: Array<[string, RegExp]> = [
      ['p50', /http_req_duration.*?p\(50\)=(\d+\.?\d*)ms/],
      ['p90', /http_req_duration.*?p\(90\)=(\d+\.?\d*)ms/],
      ['p95', /http_req_duration.*?p\(95\)=(\d+\.?\d*)ms/],
      ['p99', /http_req_duration.*?p\(99\)=(\d+\.?\d*)ms/],
      ['avg', /http_req_duration.*?avg=(\d+\.?\d*)ms/],
      ['min', /http_req_duration.*?min=(\d+\.?\d*)ms/],
      ['max', /http_req_duration.*?max=(\d+\.?\d*)ms/],
      ['rps', /http_reqs.*?(\d+\.?\d*)\/s/],
      ['totalRequests', /http_reqs.*?\s+(\d+)\s/],
      ['errorRate', /http_req_failed.*?(\d+\.?\d*)%/],
    ];

    for (const [key, pattern] of patterns) {
      const match = output.match(pattern);
      if (match) {
        metrics[key] = parseFloat(match[1]);
      }
    }

    if ('errorRate' in metrics) {
      metrics['successRate'] = 100 - (metrics['errorRate'] ?? 0);
    }

    return metrics;
  }
}
