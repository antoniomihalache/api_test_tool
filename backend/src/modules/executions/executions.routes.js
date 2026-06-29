import { Router } from 'express';
import {
  listExecutions,
  getExecution,
  getExecutionScript,
  launchExecution,
  updateExecutionMetrics,
  cancelExecution,
  listReports,
  getReportByExecution,
  createReport,
  downloadReportCsv,
} from './executions.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

// Executions
router.get('/', listExecutions);
router.get('/:id', getExecution);
router.get('/:id/script', getExecutionScript);
router.post('/launch', launchExecution);
router.patch('/:id/metrics', updateExecutionMetrics);
router.patch('/:id/cancel', cancelExecution);

// Reports
router.get('/reports', listReports);
router.get('/reports/execution/:executionId', getReportByExecution);
router.post('/reports', createReport);
router.get('/reports/:reportId/download', downloadReportCsv);

export default router;
