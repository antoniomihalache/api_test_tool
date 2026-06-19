import { Router } from 'express';
import { listAllReports, downloadReport } from './reports.controller.js';

const router = Router();

/**
 * @openapi
 * /reports:
 *   get:
 *     summary: List reports across executions
 */
router.get('/', listAllReports);
router.get('/:id/download', downloadReport);

export default router;
