import Docker from 'dockerode';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

export interface RunOptions {
  executionId: string;
  scriptContent: string;
  baseUrl: string;
  env?: Record<string, string>;
}

export interface RunResult {
  containerId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Runs a k6 script inside a Docker container on the local host.
 * The application under test is accessed via its network address from the host.
 *
 * Key design: containers are ephemeral and cleaned up after each run.
 * Scripts are written to a shared volume so spawned containers can read them.
 */
export class DockerRunner {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: config.DOCKER_SOCKET });
  }

  async run(opts: RunOptions, onLog?: (line: string) => void): Promise<RunResult> {
    const scriptPath = await this.writeScript(opts.executionId, opts.scriptContent);
    const containerScriptPath = `/scripts/${opts.executionId}.js`;

    const env = [
      `BASE_URL=${opts.baseUrl}`,
      `K6_PROMETHEUS_RW_SERVER_URL=${config.K6_PROMETHEUS_RW_SERVER_URL}`,
      `K6_PROMETHEUS_RW_TREND_STATS=p(50),p(90),p(95),p(99),avg,min,max`,
      ...Object.entries(opts.env ?? {}).map(([k, v]) => `${k}=${v}`),
    ];

    const container = await this.docker.createContainer({
      Image: config.K6_IMAGE,
      Cmd: ['run', '--out', 'experimental-prometheus-rw', containerScriptPath],
      Env: env,
      HostConfig: {
        Binds: [`${config.K6_SCRIPTS_PATH}:/scripts:ro`],
        NetworkMode: 'host', // use host network so k6 can reach internal services
        AutoRemove: false,
      },
      Labels: { 'perf-platform': 'k6-runner', executionId: opts.executionId },
    });

    const stdout: string[] = [];
    const stderr: string[] = [];

    // Attach to container output stream before starting
    const stream = await container.attach({ stream: true, stdout: true, stderr: true });
    this.docker.modem.demuxStream(
      stream,
      {
        write: (chunk: Buffer) => {
          const line = chunk.toString();
          stdout.push(line);
          onLog?.(line);
          return true;
        },
      },
      {
        write: (chunk: Buffer) => {
          const line = chunk.toString();
          stderr.push(line);
          onLog?.(`[err] ${line}`);
          return true;
        },
      },
    );

    await container.start();
    const result = await container.wait();
    await container.remove({ force: true });

    // Clean up temp script
    await fs.unlink(scriptPath).catch(() => undefined);

    return {
      containerId: container.id,
      exitCode: result.StatusCode,
      stdout: stdout.join(''),
      stderr: stderr.join(''),
    };
  }

  async cancel(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 5 });
      await container.remove({ force: true });
    } catch {
      // Container may already be stopped or removed
    }
  }

  async isRunning(containerId: string): Promise<boolean> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      return info.State.Running;
    } catch {
      return false;
    }
  }

  private async writeScript(executionId: string, content: string): Promise<string> {
    await fs.mkdir(config.K6_SCRIPTS_PATH, { recursive: true });
    const filePath = path.join(config.K6_SCRIPTS_PATH, `${executionId}.js`);
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }
}
