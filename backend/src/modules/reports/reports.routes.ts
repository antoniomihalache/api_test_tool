import { Router } from 'express';
import { listReports, generateReport, downloadReport } from './reports.controller.js';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /executions/{executionId}/reports:
 *   get:
 *     summary: List reports for an execution
 *   post:
 *     summary: Generate a report
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [html, json, csv]
 */
router.get('/', listReports);
router.post('/', generateReport);
router.get('/:id/download', downloadReport);

export default router;
