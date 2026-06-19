import Docker from 'dockerode';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

/**
 * Runs a k6 script inside a Docker container on the local host.
 * The application under test is accessed via its network address from the host.
 *
 * Key design: containers are ephemeral and cleaned up after each run.
 * Scripts are written to a shared volume so spawned containers can read them.
 */
export class DockerRunner {
  constructor() {
    this.docker = new Docker({ socketPath: config.DOCKER_SOCKET });
  }

  resolvePrometheusRwUrl() {
    const raw = config.K6_PROMETHEUS_RW_SERVER_URL;
    // Runner containers use host networking, so Docker DNS names like
    // "prometheus" are not resolvable from inside the k6 container.
    return raw.replace('http://prometheus:9090', 'http://localhost:9090');
  }

  async run(opts, onLog) {
    await this.ensureImage(config.K6_IMAGE);
    const scriptPath = await this.writeScript(opts.executionId, opts.scriptContent);
    const containerScriptPath = `/scripts/${opts.executionId}.js`;

    const env = [
      `BASE_URL=${opts.baseUrl}`,
      `K6_PROMETHEUS_RW_SERVER_URL=${this.resolvePrometheusRwUrl()}`,
      `K6_PROMETHEUS_RW_TREND_STATS=p(50),p(90),p(95),p(99),avg,min,max`,
      `K6_INSECURE_SKIP_TLS_VERIFY=true`,
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

    const stdout = [];
    const stderr = [];

    // Attach to container output stream before starting
    const stream = await container.attach({ stream: true, stdout: true, stderr: true });
    this.docker.modem.demuxStream(
      stream,
      {
        write: (chunk) => {
          const line = chunk.toString();
          stdout.push(line);
          onLog?.(line);
          return true;
        },
      },
      {
        write: (chunk) => {
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

  async cancel(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 5 });
      await container.remove({ force: true });
    } catch {
      // Container may already be stopped or removed
    }
  }

  async isRunning(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      return info.State.Running;
    } catch {
      return false;
    }
  }

  async ensureImage(image) {
    try {
      await this.docker.getImage(image).inspect();
    } catch {
      console.log(`[docker] Pulling image ${image}...`);
      await new Promise((resolve, reject) => {
        this.docker.pull(image, (err, stream) => {
          if (err) return reject(err);
          this.docker.modem.followProgress(stream, (err) => err ? reject(err) : resolve());
        });
      });
      console.log(`[docker] Image ${image} ready`);
    }
  }

  async writeScript(executionId, content) {
    await fs.mkdir(config.K6_SCRIPTS_PATH, { recursive: true });
    const filePath = path.join(config.K6_SCRIPTS_PATH, `${executionId}.js`);
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }
}
