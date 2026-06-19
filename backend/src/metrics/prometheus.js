import prometheus from 'prom-client';

const register = new prometheus.Registry();
prometheus.collectDefaultMetrics({ register });

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 500],
  registers: [register],
});

const k6ExecutionCounter = new prometheus.Counter({
  name: 'k6_executions_total',
  help: 'Total number of k6 test executions',
  labelNames: ['status', 'service'],
  registers: [register],
});

const k6IterationGauge = new prometheus.Gauge({
  name: 'k6_iterations_completed',
  help: 'Number of k6 iterations completed in current execution',
  labelNames: ['execution_id'],
  registers: [register],
});

export function recordHttpMetric(method, route, statusCode, duration) {
  httpRequestDuration.labels(method, route, statusCode).observe(duration);
}

export function incrementExecutionCounter(status, service) {
  k6ExecutionCounter.labels(status, service).inc();
}

export function setIterationGauge(executionId, value) {
  k6IterationGauge.labels(executionId).set(value);
}

export async function getMetrics() {
  return register.metrics();
}
