/**
 * Generates a valid k6 JavaScript test script from a Scenario or Flow definition.
 */
export class K6Generator {
  // ── Public API ──────────────────────────────────────────────

  generateFromScenario(scenario, ctx) {
    const options = this.buildOptions(scenario.type, scenario.vus, scenario.duration, scenario.stages, scenario.thresholds);
    const auth = this.buildAuthBlock(ctx.authConfig);
    const requests = scenario.requests.map((req) => this.buildRequest(req, ctx.baseUrl)).join('\n\n');

    return this.wrap({ options, auth, body: requests, prometheusRwUrl: ctx.prometheusRwUrl });
  }

  generateFromFlow(flow, ctx) {
    const options = this.buildOptions('load', flow.vus, flow.duration, undefined, []);
    const auth = this.buildAuthBlock(ctx.authConfig);
    const steps = flow.steps.map((step, i) => this.buildFlowStep(step, ctx.baseUrl, i)).join('\n\n');

    return this.wrap({ options, auth, body: steps, prometheusRwUrl: ctx.prometheusRwUrl });
  }

  // ── Options ─────────────────────────────────────────────────

  buildOptions(type, vus, duration, stages, thresholds) {
    const thresholdBlock = this.buildThresholds(type, thresholds ?? []);

    if (stages && stages.length > 0) {
      const stagesJson = JSON.stringify(stages.map((s) => ({ duration: s.duration, target: s.target })), null, 6);
      return `export const options = {
  stages: ${stagesJson},
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  ${thresholdBlock}
};`;
    }

    const executorBlock = this.buildExecutor(type, vus, duration);
    return `export const options = {
  ${executorBlock}
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  ${thresholdBlock}
};`;
  }

  buildExecutor(type, vus, duration) {
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

  buildThresholds(type, custom) {
    const defaults = this.defaultThresholds(type);
    const all = { ...defaults };

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

  defaultThresholds(type) {
    const base = {
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

  buildAuthBlock(authConfig) {
    if (!authConfig || authConfig.type === 'none') return '';

    switch (authConfig.type) {
      case 'bearer':
      case 'jwt': {
        if (authConfig.staticToken) {
          const headerName = authConfig.tokenHeaderName ?? 'Authorization';
          return `
const TOKEN = ${JSON.stringify(authConfig.staticToken)};
function authHeaders() {
  return { ${JSON.stringify(headerName)}: \`Bearer \${TOKEN}\` };
}
function forceRefresh() {
  return { token: TOKEN, refreshToken: null, issuedAt: Date.now() };
}
`;
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

  buildLoginAuth(authConfig) {
    const loginEndpoint = authConfig.loginEndpoint ?? '/auth/login';
    const refreshEndpoint = authConfig.refreshEndpoint ?? '';
    const headerName = authConfig.tokenHeaderName ?? 'Authorization';
    const tokenPath = authConfig.tokenExtractPath ?? 'access_token';
    const refreshTokenPath = authConfig.refreshTokenPath ?? 'refresh_token';
    const otpMode = authConfig.otpMode ?? 'none';
    const otpFieldName = authConfig.otpFieldName ?? 'totp';
    const storedSecret = authConfig.otpSecret ?? '';
    const isForm = (authConfig.loginBodyEncoding ?? 'json') === 'form';
    const body = authConfig.loginBody || {};
    const loginContentType = isForm ? 'application/x-www-form-urlencoded' : 'application/json';
    const headers = JSON.stringify({
      'Content-Type': loginContentType,
      ...(authConfig.loginHeaders ?? {}),
    });

    // form-urlencoded helper — used when loginBodyEncoding is 'form' (e.g. Keycloak token endpoint)
    const formEncodeHelper = isForm ? `
function formEncode(obj) {
  return Object.keys(obj).map(function(k) {
    return encodeURIComponent(String(k)) + '=' + encodeURIComponent(String(obj[k] == null ? '' : obj[k]));
  }).join('&');
}` : '';

    // TOTP helper — Base32 decoder is included because TOTP secrets from authenticator
    // apps (Google Authenticator, Authy, etc.) are always Base32-encoded, not Base64.
    const totpHelper = otpMode === 'secret' ? `
function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  str = str.replace(/\\s+/g, '').replace(/=+$/, '').toUpperCase();
  const buf = new ArrayBuffer(Math.floor(str.length * 5 / 8));
  const view = new Uint8Array(buf);
  let bits = 0, val = 0, idx = 0;
  for (let i = 0; i < str.length; i++) {
    const charIdx = alphabet.indexOf(str[i]);
    if (charIdx === -1) continue;
    val = (val << 5) | charIdx;
    bits += 5;
    if (bits >= 8) { view[idx++] = (val >>> (bits - 8)) & 0xff; bits -= 8; }
  }
  return buf;
}

function generateTOTP(secret) {
  const timeStep = 30;
  const digits = 6;
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(4, counter);
  const key = base32Decode(secret);
  const hash = crypto.hmac('sha1', key, msg, 'binary');
  const offset = hash[hash.length - 1] & 0xf;
  const binary = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16) | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}` : '';

    // Build OTP injection: always inject when mode is set, regardless of the otpRequired checkbox.
    // mode='secret' → generate TOTP automatically (use stored secret or OTP_SECRET env var)
    // mode='code'   → inject manual OTP code from OTP_CODE env var
    let otpInjection = '';
    if (otpMode === 'secret') {
      const secretExpr = storedSecret ? JSON.stringify(storedSecret) : '__ENV.OTP_SECRET';
      otpInjection = `loginBody[${JSON.stringify(otpFieldName)}] = generateTOTP(${secretExpr});`;
    } else if (otpMode === 'code') {
      otpInjection = `if (__ENV.OTP_CODE) { loginBody[${JSON.stringify(otpFieldName)}] = __ENV.OTP_CODE; }`;
    }

    const bodySerialize = isForm ? 'formEncode(loginBody)' : 'JSON.stringify(loginBody)';
    const refreshBodySerialize = isForm
      ? `formEncode({ grant_type: 'refresh_token', refresh_token: session.refreshToken })`
      : `JSON.stringify({ grant_type: 'refresh_token', refresh_token: session.refreshToken })`;

    return `${formEncodeHelper}${totpHelper}
// ── Session store (one token per VU) with auto-refresh ───────
const TOKEN_MAX_AGE_MS = 4 * 60 * 1000;
const REFRESH_ENDPOINT = ${JSON.stringify(refreshEndpoint)};
const sessions = new Map();

function authenticate(baseUrl) {
  let loginBody = ${JSON.stringify(body)};
  ${otpInjection}

  const loginRes = http.post(baseUrl + ${JSON.stringify(loginEndpoint)}, ${bodySerialize}, {
    headers: ${headers},
  });
  if (loginRes.status < 200 || loginRes.status >= 300) {
    console.error('[auth] Login failed ' + loginRes.status + ' URL=' + baseUrl + ${JSON.stringify(loginEndpoint)} + ' body=' + loginRes.body);
    throw new Error('Authentication failed: HTTP ' + loginRes.status + ' from token endpoint');
  }
  check(loginRes, { 'login successful': (r) => r.status >= 200 && r.status < 300 });
  const data = loginRes.json();
  const accessToken = data${this.jsonPathToJS(tokenPath)};
  if (!accessToken) {
    console.error('[auth] Token path ${tokenPath} not found in login response body=' + loginRes.body);
    throw new Error('Authentication failed: tokenExtractPath did not resolve a token');
  }
  return {
    token: accessToken,
    refreshToken: data${this.jsonPathToJS(refreshTokenPath)} || null,
    issuedAt: Date.now(),
  };
}

function refreshToken(baseUrl, session) {
  if (!REFRESH_ENDPOINT || !session?.refreshToken) {
    return authenticate(baseUrl);
  }
  const refreshRes = http.post(baseUrl + REFRESH_ENDPOINT, ${refreshBodySerialize}, {
    headers: ${headers},
  });
  if (refreshRes.status >= 200 && refreshRes.status < 300) {
    const data = refreshRes.json();
    if (data${this.jsonPathToJS(tokenPath)}) {
      return { token: data${this.jsonPathToJS(tokenPath)}, refreshToken: data${this.jsonPathToJS(refreshTokenPath)} || session.refreshToken, issuedAt: Date.now() };
    }
  }
  if (refreshRes.status < 200 || refreshRes.status >= 300) {
    console.error('[auth] Refresh failed ' + refreshRes.status + ' URL=' + baseUrl + REFRESH_ENDPOINT + ' body=' + refreshRes.body);
  }
  return authenticate(baseUrl);
}

function getOrCreateSession(baseUrl) {
  const vuId = __VU;
  let session = sessions.get(vuId);
  if (!session) {
    session = authenticate(baseUrl);
    sessions.set(vuId, session);
    return session;
  }
  if (Date.now() - session.issuedAt >= TOKEN_MAX_AGE_MS) {
    session = refreshToken(baseUrl, session);
    sessions.set(vuId, session);
  }
  return session;
}

function forceRefresh(baseUrl) {
  const vuId = __VU;
  const session = refreshToken(baseUrl, sessions.get(vuId) || {});
  sessions.set(vuId, session);
  return session;
}

function authHeaders(baseUrl) {
  const session = getOrCreateSession(baseUrl);
  return { ${JSON.stringify(headerName)}: \`Bearer \${session.token}\` };
}
`;
  }

  jsonPathToJS(path) {
    return path
      .split('.')
      .map((p) => `[${JSON.stringify(p)}]`)
      .join('');
  }

  // ── Request builders ─────────────────────────────────────────

  buildRequest(req, baseUrl, hasAuth = false) {
    const url = `\`${baseUrl}${req.path}\``;
    const headers = req.headers ? JSON.stringify(req.headers) : '{}';
    const tags = JSON.stringify({ name: req.name, endpoint: req.path, request_method: req.method });
    const body = req.body ? JSON.stringify(req.body) : 'null';

    const method = req.method.toLowerCase();
    const authMerge = hasAuth ? ', authHeaders(BASE_URL)' : '';
    const callArgs =
      ['post', 'put', 'patch'].includes(method)
        ? `${url}, ${body}, { headers: Object.assign({}, baseHeaders, ${headers}${authMerge}), tags: ${tags} }`
        : `${url}, { headers: Object.assign({}, baseHeaders, ${headers}${authMerge}), tags: ${tags} }`;
    const retryCallArgs =
      ['post', 'put', 'patch'].includes(method)
        ? `${url}, ${body}, { headers: Object.assign({}, baseHeaders, ${headers}, authHeaders(BASE_URL)), tags: ${tags} }`
        : `${url}, { headers: Object.assign({}, baseHeaders, ${headers}, authHeaders(BASE_URL)), tags: ${tags} }`;

    const checks = this.buildChecks(req.assertions, req.name);
    const retry = hasAuth ? `
    if (res.status === 401 && typeof forceRefresh === 'function') {
      forceRefresh(BASE_URL);
      res = http.${method}(${retryCallArgs});
    }` : '';

    return `  // ${req.name}
  {
    let res = http.${method}(${callArgs});${retry}
${checks}
    trend_${this.safeName(req.name)}.add(res.timings.duration);
  }`;
  }

  buildFlowStep(step, baseUrl, index, hasAuth = false) {
    const url = `\`${baseUrl}${step.path.replace(/\{\{(\w+)\}\}/g, '${vars.$1}')}\``;
    const headers = step.headers ? JSON.stringify(step.headers) : '{}';
    const tags = JSON.stringify({ name: step.name, endpoint: step.path, request_method: step.method });
    const body = step.body
      ? `JSON.stringify(${step.body.replace(/\{\{(\w+)\}\}/g, '${vars.$1}')})`
      : 'null';

    const method = step.method.toLowerCase();
    const authMerge = hasAuth ? ', authHeaders(BASE_URL)' : '';
    const callArgs =
      ['post', 'put', 'patch'].includes(method)
        ? `${url}, ${body}, { headers: Object.assign({}, baseHeaders, ${headers}${authMerge}), tags: ${tags} }`
        : `${url}, { headers: Object.assign({}, baseHeaders, ${headers}${authMerge}), tags: ${tags} }`;
    const retryCallArgs =
      ['post', 'put', 'patch'].includes(method)
        ? `${url}, ${body}, { headers: Object.assign({}, baseHeaders, ${headers}, authHeaders(BASE_URL)), tags: ${tags} }`
        : `${url}, { headers: Object.assign({}, baseHeaders, ${headers}, authHeaders(BASE_URL)), tags: ${tags} }`;

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

    const retry = hasAuth ? `
    if (res.status === 401 && typeof forceRefresh === 'function') {
      forceRefresh(BASE_URL);
      res = http.${method}(${retryCallArgs});
    }` : '';

    return `  // Step ${index + 1}: ${step.name}
${condition}  {
    let res = http.${method}(${callArgs});${retry}
${checks}
${extractions}
    trend_step_${index}.add(res.timings.duration);
  }`;
  }

  buildChecks(assertions, name) {
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

  opToJS(operator) {
    const map = {
      eq: '===',
      lt: '<',
      gt: '>',
      contains: '===', // handled differently in body checks
    };
    return map[operator] ?? '===';
  }

  safeName(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  // ── Trend metrics declarations ───────────────────────────────

  buildTrendDeclarations(requests) {
    return requests
      .map(
        (r) =>
          `const trend_${this.safeName(r.name)} = new Trend(${JSON.stringify('req_' + this.safeName(r.name))});`,
      )
      .join('\n');
  }

  buildFlowTrends(steps) {
    return steps
      .map((_, i) => `const trend_step_${i} = new Trend('flow_step_${i}');`)
      .join('\n');
  }

  // ── Final script assembly ────────────────────────────────────

  wrap(params) {
    const rwExport = params.prometheusRwUrl
      ? `
// Prometheus Remote Write output is configured via K6_PROMETHEUS_RW_SERVER_URL env var
`
      : '';
    const cryptoImport = params.needsCrypto ? `import crypto from 'k6/crypto';\n` : '';

    // Inject insecureSkipTLSVerify so internal / self-signed certs don't block requests
    const optionsWithTLS = params.options.replace(
      /export const options = \{/,
      `export const options = {\n  insecureSkipTLSVerify: true,`
    );

    return `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
${cryptoImport}
${optionsWithTLS}

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

  generateScript(scenario, ctx) {
    const options = this.buildOptions(
      scenario.type,
      scenario.vus,
      scenario.duration,
      scenario.stages,
      scenario.thresholds,
    );
    const auth = this.buildAuthBlock(ctx.authConfig);
    const hasAuth = !!auth && auth.length > 0;
    const needsCrypto = ctx.authConfig?.otpMode === 'secret';
    const trends = this.buildTrendDeclarations(scenario.requests);
    const requests = scenario.requests
      .map((req) => this.buildRequest(req, ctx.baseUrl, hasAuth))
      .join('\n\n');

    return this.wrap({ options, auth, body: requests, trends, prometheusRwUrl: ctx.prometheusRwUrl, needsCrypto });
  }

  generateFlowScript(flow, ctx) {
    const options = this.buildOptions('load', flow.vus, flow.duration, undefined, []);
    const auth = this.buildAuthBlock(ctx.authConfig);
    const hasAuth = !!auth && auth.length > 0;
    const needsCrypto = ctx.authConfig?.otpMode === 'secret';
    const trends = this.buildFlowTrends(flow.steps);
    const steps = flow.steps
      .map((step, i) => this.buildFlowStep(step, ctx.baseUrl, i, hasAuth))
      .join('\n\n');

    const varInit = '  const vars = {};';
    return this.wrap({ options, auth, body: `${varInit}\n\n${steps}`, trends, prometheusRwUrl: ctx.prometheusRwUrl, needsCrypto });
  }
}
