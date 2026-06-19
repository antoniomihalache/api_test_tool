import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { getPrometheusMetrics } from './metrics/prometheus.js';

import authRoutes from './modules/auth/auth.routes.js';
import servicesRoutes from './modules/services/services.routes.js';
import scenariosRoutes from './modules/scenarios/scenarios.routes.js';
import flowsRoutes from './modules/flows/flows.routes.js';
import executionsRoutes from './modules/executions/executions.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import reportsGlobalRoutes from './modules/reports/reports-global.routes.js';

export function createApp(): express.Application {
  const app = express();

  // ── Security headers ────────────────────────────────────────
  app.use(helmet());
  app.disable('x-powered-by');

  // ── CORS ────────────────────────────────────────────────────
  const allowedOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
    }),
  );

  // ── Rate limiting ───────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // ── Body parsing ────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  // ── Logging ─────────────────────────────────────────────────
  if (config.NODE_ENV !== 'test') {
    app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // ── Health check ─────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
  app.get('/metrics', getPrometheusMetrics);

  // ── API routes ──────────────────────────────────────────────
  const api = '/api/v1';
  app.use(`${api}/auth`, authRoutes);
  app.use(`${api}/services`, authMiddleware, servicesRoutes);
  app.use(`${api}/scenarios`, authMiddleware, scenariosRoutes);
  app.use(`${api}/flows`, authMiddleware, flowsRoutes);
  app.use(`${api}/executions`, authMiddleware, executionsRoutes);
  app.use(`${api}/executions/:executionId/reports`, authMiddleware, reportsRoutes);
  app.use(`${api}/reports`, authMiddleware, reportsGlobalRoutes);

  // ── Error handling ───────────────────────────────────────────
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
