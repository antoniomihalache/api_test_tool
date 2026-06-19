import { IScenario, IFlow, ScenarioType, StageConfig, AuthConfig } from '../types/index.js';

interface GeneratorContext {
  baseUrl: string;
  authConfig?: AuthConfig;
  prometheusRwUrl?: string;
}

/**
 * Generates a valid k6 JavaScript test script from a Scenario or Flow definition.
 */
export class K6Generator {
  // ── Public API ──────────────────────────────────────────────

  generateFromScenario(scenario: IScenario, ctx: GeneratorContext): string {
    const options = this.buildOptions(scenario.type, scenario.vus, scenario.duration, scenario.stages, scenario.thresholds);
    const auth = this.buildAuthBlock(ctx.authConfig);
    const requests = scenario.requests.map((req) => this.buildRequest(req, ctx.baseUrl)).join('\n\n');

    return this.wrap({ options, auth, body: requests, prometheusRwUrl: ctx.prometheusRwUrl });
  }

  generateFromFlow(flow: IFlow, ctx: GeneratorContext): string {
    const options = this.buildOptions('load', flow.vus, flow.duration, undefined, []);
    const auth = this.buildAuthBlock(ctx.authConfig);
    const steps = flow.steps.map((step, i) => this.buildFlowStep(step, ctx.baseUrl, i)).join('\n\n');

    return this.wrap({ options, auth, body: steps, prometheusRwUrl: ctx.prometheusRwUrl });
  }

  // ── Options ─────────────────────────────────────────────────

  private buildOptions(
    type: ScenarioType,
    vus: number,
    duration: string,
    stages?: StageConfig[],
    thresholds?: Array<{ metric: string; condition: string }>,
  ): string {
    const thresholdBlock = this.buildThresholds(type, thresholds ?? []);

    if (stages && stages.length > 0) {
      const stagesJson = JSON.stringify(stages.map((s) => ({ duration: s.duration, target: s.target })), null, 6);
      return `export const options = {
  stages: ${stagesJson},
  ${thresholdBlock}
};`;
    }

    const executorBlock = this.buildExecutor(type, vus, duration);
    return `export const options = {
  ${executorBlock}
  ${thresholdBlock}
};`;
  }

  private buildExecutor(type: ScenarioType, vus: number, duration: string): string {
    switch (type) {
      case 'smoke':
        return `vus: 2,\n  duration: '1m',`;
      case 'stress':
        return `scenarios: {
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: ${vus},
      maxVUs: ${vus * 3},
      stages: [
        { duration: '2m', target: ${Math.floor(vus / 2)} },
        { duration: '5m', target: ${vus} },
        { duration: '2m', target: ${vus * 3} },
        { duration: '2m', target: 0 },
      ],
    },
  },`;
      case 'spike':
        return `scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: ${vus * 5} },
        { duration: '1m', target: ${vus * 5} },
        { duration: '10s', target: 0 },
      ],
    },
  },`;
      case 'soak':
        return `vus: ${vus},\n  duration: ${JSON.stringify(duration)},`;
      default:
        return `vus: ${vus},\n  duration: ${JSON.stringify(duration)},`;
    }
  }

  private buildThresholds(
    type: ScenarioType,
    custom: Array<{ metric: string; condition: string }>,
  ): string {
    const defaults = this.defaultThresholds(type);
    const all: Record<string, string[]> = { ...defaults };

    for (const t of custom) {
      if (!all[t.metric]) all[t.metric] = [];
      all[t.metric].push(t.condition);
    }

    if (Object.keys(all).length === 0) return '';

    const entries = Object.entries(all)
      .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
      .join(',\n');

    return `thresholds: {\n${entries}\n  },`;
  }

  private defaultThresholds(type: ScenarioType): Record<string, string[]> {
    const base: Record<string, string[]> = {
      http_req_failed: ['rate<0.05'],
      http_req_duration: ['p(95)<500'],
    };
    if (type === 'stress') {
      base['http_req_duration'] = ['p(95)<1000'];
      base['http_req_failed'] = ['rate<0.10'];
    }
    if (type === 'smoke') {
      base['http_req_failed'] = ['rate<0.01'];
      base['http_req_duration'] = ['p(99)<200'];
    }
    return base;
  }

  // ── Auth ────────────────────────────────────────────────────

  private buildAuthBlock(authConfig?: AuthConfig): string {
    if (!authConfig || authConfig.type === 'none') return '';

    switch (authConfig.type) {
      case 'bearer':
      case 'jwt': {
        if (authConfig.staticToken) {
          return `const TOKEN = ${JSON.stringify(authConfig.staticToken)};`;
        }
        return this.buildLoginAuth(authConfig);
      }
      case 'basic': {
        const creds = Buffer.from(
          `${authConfig.username ?? ''}:${authConfig.password ?? ''}`,
        ).toString('base64');
        return `const BASIC_AUTH = 'Basic ${creds}';`;
      }
      case 'oauth2':
      case 'custom':
        return this.buildLoginAuth(authConfig);
      default:
        return '';
    }
  }

  private buildLoginAuth(authConfig: AuthConfig): string {
    const loginEndpoint = authConfig.loginEndpoint ?? '/auth/login';
    const headerName = authConfig.tokenHeaderName ?? 'Authorization';
    const tokenPath = authConfig.tokenExtractPath ?? 'token';
    const body = authConfig.loginBody ? JSON.stringify(authConfig.loginBody) : '{}';
    const headers = JSON.stringify({
      'Content-Type': 'application/json',
      ...(authConfig.loginHeaders ?? {}),
    });

    return `
// ── Session store (one token per VU) ─────────────────────────
const sessions = new Map();

function getOrCreateSession(baseUrl) {
  const vuId = __VU;
  if (!sessions.has(vuId)) {
    const loginRes = http.post(baseUrl + ${JSON.stringify(loginEndpoint)}, JSON.stringify(${body}), {
      headers: ${headers},
    });
    check(loginRes, { 'login successful': (r) => r.status === 200 });
    const data = loginRes.json();
    const token = data${this.jsonPathToJS(tokenPath)};
    sessions.set(vuId, token);
  }
  return sessions.get(vuId);
}

function authHeaders(baseUrl) {
  const token = getOrCreateSession(baseUrl);
  return { ${JSON.stringify(headerName)}: \`Bearer \${token}\` };
}
`;
  }

  private jsonPathToJS(path: string): string {
    return path
      .split('.')
      .map((p) => `[${JSON.stringify(p)}]`)
      .join('');
  }

  // ── Request builders ─────────────────────────────────────────

  private buildRequest(
    req: IScenario['requests'][number],
    baseUrl: string,
  ): string {
    const url = `\`${baseUrl}${req.path}\``;
    const headers = req.headers ? JSON.stringify(req.headers) : '{}';
    const body = req.body ? JSON.stringify(req.body) : 'null';

    const method = req.method.toLowerCase();
    const callArgs =
      ['post', 'put', 'patch'].includes(method)
        ? `${url}, ${body}, { headers: Object.assign({}, baseHeaders, ${headers}) }`
        : `${url}, { headers: Object.assign({}, baseHeaders, ${headers}) }`;

    const checks = this.buildChecks(req.assertions, req.name);

    return `  // ${req.name}
  {
    const res = http.${method}(${callArgs});
${checks}
    trend_${this.safeName(req.name)}.add(res.timings.duration);
  }`;
  }

  private buildFlowStep(
    step: IFlow['steps'][number],
    baseUrl: string,
    index: number,
  ): string {
    const url = `\`${baseUrl}${step.path.replace(/\{\{(\w+)\}\}/g, '${vars.$1}')}\``;
    const headers = step.headers ? JSON.stringify(step.headers) : '{}';
    const body = step.body
      ? `JSON.stringify(${step.body.replace(/\{\{(\w+)\}\}/g, '${vars.$1}')})`
      : 'null';

    const method = step.method.toLowerCase();
    const callArgs =
      ['post', 'put', 'patch'].includes(method)
        ? `${url}, ${body}, { headers: Object.assign({}, baseHeaders, ${headers}) }`
        : `${url}, { headers: Object.assign({}, baseHeaders, ${headers}) }`;

    const checks = this.buildChecks(step.assertions, step.name);

    const extractions = (step.extractVars ?? [])
      .map((v) => {
        const jsPath = this.jsonPathToJS(v.jsonPath);
        return `    vars[${JSON.stringify(v.name)}] = res.json()${jsPath};`;
      })
      .join('\n');

    const condition = step.condition
      ? `  if (!(${step.condition})) { return; }\n`
      : '';

    return `  // Step ${index + 1}: ${step.name}
${condition}  {
    const res = http.${method}(${callArgs});
${checks}
${extractions}
    trend_step_${index}.add(res.timings.duration);
  }`;
  }

  private buildChecks(
    assertions: Array<{ type: string; operator: string; value: string | number }>,
    name: string,
  ): string {
    if (!assertions.length) return '';

    const checkEntries = assertions
      .map((a) => {
        const label = `${name} ${a.type} ${a.operator} ${a.value}`;
        let expr = '';
        switch (a.type) {
          case 'status':
            expr = `(r) => r.status ${this.opToJS(a.operator)} ${a.value}`;
            break;
          case 'latency':
            expr = `(r) => r.timings.duration ${this.opToJS(a.operator)} ${a.value}`;
            break;
          case 'body':
            expr = `(r) => r.body.includes(${JSON.stringify(a.value)})`;
            break;
          case 'header':
            expr = `(r) => r.headers[${JSON.stringify(a.value)}] !== undefined`;
            break;
        }
        return `      ${JSON.stringify(label)}: ${expr}`;
      })
      .join(',\n');

    return `    check(res, {\n${checkEntries}\n    });`;
  }

  private opToJS(operator: string): string {
    const map: Record<string, string> = {
      eq: '===',
      lt: '<',
      gt: '>',
      contains: '===', // handled differently in body checks
    };
    return map[operator] ?? '===';
  }

  private safeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  // ── Trend metrics declarations ───────────────────────────────

  private buildTrendDeclarations(requests: Array<{ name: string }>): string {
    return requests
      .map(
        (r) =>
          `const trend_${this.safeName(r.name)} = new Trend(${JSON.stringify('req_' + this.safeName(r.name))});`,
      )
      .join('\n');
  }

  private buildFlowTrends(steps: Array<unknown>): string {
    return steps
      .map((_, i) => `const trend_step_${i} = new Trend('flow_step_${i}');`)
      .join('\n');
  }

  // ── Final script assembly ────────────────────────────────────

  private wrap(params: {
    options: string;
    auth: string;
    body: string;
    trends?: string;
    prometheusRwUrl?: string;
  }): string {
    const rwExport = params.prometheusRwUrl
      ? `
// Prometheus Remote Write output is configured via K6_PROMETHEUS_RW_SERVER_URL env var
`
      : '';

    return `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

${params.options}

${params.trends ?? ''}

const errorRate = new Rate('errors');
const requestCount = new Counter('request_count');
${rwExport}
${params.auth}

export default function () {
  const BASE_URL = __ENV.BASE_URL;
  const baseHeaders = { 'Content-Type': 'application/json' };

${params.body}

  sleep(1);
}
`;
  }

  // ── Scenario-aware wrapper ───────────────────────────────────

  generateScript(scenario: IScenario, ctx: GeneratorContext): string {
    const options = this.buildOptions(
      scenario.type,
      scenario.vus,
      scenario.duration,
      scenario.stages,
      scenario.thresholds,
    );
    const auth = this.buildAuthBlock(ctx.authConfig);
    const trends = this.buildTrendDeclarations(scenario.requests);
    const requests = scenario.requests
      .map((req) => this.buildRequest(req, ctx.baseUrl))
      .join('\n\n');

    return this.wrap({ options, auth, body: requests, trends, prometheusRwUrl: ctx.prometheusRwUrl });
  }

  generateFlowScript(flow: IFlow, ctx: GeneratorContext): string {
    const options = this.buildOptions('load', flow.vus, flow.duration, undefined, []);
    const auth = this.buildAuthBlock(ctx.authConfig);
    const trends = this.buildFlowTrends(flow.steps);
    const steps = flow.steps
      .map((step, i) => this.buildFlowStep(step, ctx.baseUrl, i))
      .join('\n\n');

    const varInit = '  const vars = {};';
    return this.wrap({ options, auth, body: `${varInit}\n\n${steps}`, trends, prometheusRwUrl: ctx.prometheusRwUrl });
  }
}
