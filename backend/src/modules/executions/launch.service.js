import { ExecutionModel, ReportModel } from '../executions/executions.model.js';
import { ScenarioModel } from '../scenarios/scenarios.model.js';
import { ServiceModel } from '../services/services.model.js';
import { AuthConfigModel } from '../auth/auth.model.js';
import { tryResolveXc1TokenFallback } from '../auth/xc1-auth-fallback.service.js';
import { K6Generator } from '../../generator/k6-generator.js';
import { DockerRunner } from '../../runner/docker-runner.js';
import { KubernetesRunner } from '../../runner/k8s-runner.js';
import { config } from '../../config/index.js';
import { createError } from '../../middleware/error.middleware.js';

const generator = new K6Generator();

export class LaunchService {
  async launchScenario(scenarioId, userId) {
    // 1. Load scenario + service
    const scenario = await ScenarioModel.findById(scenarioId).lean();
    if (!scenario) throw createError('Scenario not found', 404);

    const service = await ServiceModel.findById(scenario.serviceId).lean();
    if (!service) throw createError('Service not found', 404);

    const envEntry = service.environments.find(e => e.name === scenario.environment);
    if (!envEntry) throw createError(`Service has no "${scenario.environment}" environment`, 400);

    // 2. Load auth config if set
    let authConfig = null;
    if (scenario.authConfigId) {
      authConfig = await AuthConfigModel.findById(scenario.authConfigId).lean();

      // XC1 fallback: when direct grant is blocked, obtain token via browser/PKCE flow
      // (same strategy as xc1-ffdc-parser) and inject it as static token for this run.
      if (authConfig && !authConfig.staticToken) {
        try {
          const fallbackToken = await tryResolveXc1TokenFallback({
            baseUrl: envEntry.baseUrl,
            authConfig,
          });
          if (fallbackToken) {
            authConfig = { ...authConfig, staticToken: fallbackToken };
          }
        } catch (err) {
          console.error('[launch] XC1 auth fallback error:', err.message);
        }
      }
    }

    // 3. Generate k6 script
    const script = generator.generateScript(scenario, {
      baseUrl: envEntry.baseUrl,
      authConfig,
      prometheusRwUrl: config.K6_PROMETHEUS_RW_SERVER_URL,
    });

    // 4. Create execution record (pending)
    const execution = await ExecutionModel.create({
      scenarioId,
      serviceId: scenario.serviceId,
      userId,
      status: 'pending',
      runnerMode: config.RUNNER_MODE,
      k6Script: script,
      vus: scenario.vus,
      startTime: new Date(),
    });

    // 5. Run asynchronously (don't block HTTP response)
    this._runInBackground(execution._id.toString(), script, envEntry.baseUrl);

    return execution.toObject();
  }

  async _runInBackground(executionId, script, baseUrl) {
    try {
      await ExecutionModel.findByIdAndUpdate(executionId, { status: 'running' });

      const logs = [];
      let flushTimer = null;

      const flushLogs = () => {
        ExecutionModel.findByIdAndUpdate(executionId, { logOutput: logs.join('') }).catch(() => undefined);
      };

      const onLog = (line) => {
        logs.push(line);
        // Debounce: flush to DB at most every 1s
        if (!flushTimer) {
          flushTimer = setTimeout(() => { flushTimer = null; flushLogs(); }, 1000);
        }
      };

      let result;
      if (config.RUNNER_MODE === 'kubernetes') {
        // Extract p95, p99, avg from http_req_duration line
        const durationMatch = output.match(/http_req_duration[.\s]*:[^p]*p\(95\)=([0-9.]+)/);
        const p99Match = output.match(/http_req_duration[.\s]*:[^p]*p\(99\)=([0-9.]+)/);
        const avgMatch = output.match(/http_req_duration[.\s]*:.*?avg=([0-9.]+)/);
    
        // Extract RPS from http_reqs line
        const rpsMatch = output.match(/http_reqs[.\s]*:[.\s]*(\d+)[.\s]+([0-9.]+)/);
    
        // Extract failure rate from http_req_failed line
        const failMatch = output.match(/http_req_failed[.\s]*:[.\s]*([0-9.]+)%/);
    
        // Extract iterations from iterations line
        const iterMatch = output.match(/iterations[.\s]*:[.\s]*(\d+)/);
        const runner = new KubernetesRunner();
        result = await runner.run({ executionId, scriptContent: script, baseUrl, vus: 1, duration: '1m' });
        await this._pollK8sJob(executionId, result.jobName, runner);
        return;
      } else {
        const runner = new DockerRunner();
        result = await runner.run({ executionId, scriptContent: script, baseUrl }, onLog);
      }

      const logOutput = logs.join('');
      if (flushTimer) { clearTimeout(flushTimer); }
      const succeeded = result.exitCode === 0;
      const thresholdBreached = /thresholds on metrics/i.test(logOutput);
      const finalStatus = (succeeded || thresholdBreached) ? 'completed' : 'failed';

      // Parse basic metrics from k6 stdout
      const metrics = this._parseK6Output(logOutput);

      await ExecutionModel.findByIdAndUpdate(executionId, {
        status: finalStatus,
        endTime: new Date(),
        logOutput,
        runnerId: result.containerId,
        thresholdBreached,
        ...metrics,
      });

      // Save report if run completed (including threshold breach warnings)
      if (finalStatus === 'completed') {
        const execution = await ExecutionModel.findById(executionId).lean();
        await ReportModel.create({
          executionId,
          serviceId: execution.serviceId,
          scenarioId: execution.scenarioId,
          metricsJson: JSON.stringify(metrics),
          ...metrics,
        });
      }
    } catch (err) {
      console.error(`[launch] Execution ${executionId} failed:`, err.message);
      await ExecutionModel.findByIdAndUpdate(executionId, {
        status: 'failed',
        endTime: new Date(),
        logOutput: err.message,
      }).catch(() => undefined);
    }
  }

  async _pollK8sJob(executionId, jobName, runner) {
    const maxWaitMs = 60 * 60 * 1000; // 1 hour
    const pollIntervalMs = 5000;
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      await new Promise(r => setTimeout(r, pollIntervalMs));
      const status = await runner.getJobStatus(jobName);
      if (status === 'completed') {
        const logs = await runner.getLogs(jobName);
        const metrics = this._parseK6Output(logs);
        const thresholdBreached = /thresholds on metrics/i.test(logs);
        await ExecutionModel.findByIdAndUpdate(executionId, { status: 'completed', thresholdBreached, endTime: new Date(), logOutput: logs, ...metrics });
        return;
      }
      if (status === 'failed') {
        const logs = await runner.getLogs(jobName);
        const thresholdBreached = /thresholds on metrics/i.test(logs);
        await ExecutionModel.findByIdAndUpdate(executionId, {
          status: thresholdBreached ? 'completed' : 'failed',
          thresholdBreached,
          endTime: new Date(),
          logOutput: logs,
        });
        return;
      }
    }
    await ExecutionModel.findByIdAndUpdate(executionId, { status: 'failed', endTime: new Date(), logOutput: 'Timed out waiting for k8s job' });
  }

  _parseK6Output(output) {
    const metrics = {};
    const p95Match = output.match(/http_req_duration.*?p\(95\)=(\d+(?:\.\d+)?)/);
    const p99Match = output.match(/http_req_duration.*?p\(99\)=(\d+(?:\.\d+)?)/);
    const avgMatch = output.match(/http_req_duration.*?avg=(\d+(?:\.\d+)?)/);
    const rpsMatch = output.match(/http_reqs[.\s]*:\s*(\d+)\s+(\d+(?:\.\d+)?)/);
    const failMatch = output.match(/http_req_failed.*?(\d+(?:\.\d+)?)%/);
    const iterMatch = output.match(/iterations[.\s]*:\s*(\d+)/);

    if (p95Match) metrics.p95Latency = parseFloat(p95Match[1]);
    if (p99Match) metrics.p99Latency = parseFloat(p99Match[1]);
    if (avgMatch) metrics.avgLatency = parseFloat(avgMatch[1]);
    if (rpsMatch) metrics.rps = parseFloat(rpsMatch[2]);
    if (failMatch) metrics.failureRate = parseFloat(failMatch[1]) / 100;
    if (iterMatch) metrics.iterationCount = parseInt(iterMatch[1]);

    return metrics;
  }

  async cancel(executionId) {
    const execution = await ExecutionModel.findById(executionId).lean();
    if (!execution) throw createError('Execution not found', 404);

    if (execution.runnerId && execution.runnerMode === 'docker') {
      const runner = new DockerRunner();
      await runner.cancel(execution.runnerId).catch(() => undefined);
    }

    return ExecutionModel.findByIdAndUpdate(executionId, { status: 'cancelled', endTime: new Date() }, { new: true }).lean();
  }
}
