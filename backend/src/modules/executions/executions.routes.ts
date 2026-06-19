import { Router } from 'express';
import {
  listExecutions,
  getExecution,
  startExecution,
  cancelExecution,
  archiveExecution,
} from './executions.controller.js';

const router = Router();

/**
 * @openapi
 * /executions:
 *   get:
 *     summary: List executions
 *     parameters:
 *       - name: status
 *         in: query
 *         schema: { type: string }
 *       - name: serviceId
 *         in: query
 *         schema: { type: string }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50 }
 *   post:
 *     summary: Start a new execution
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scenarioId: { type: string }
 *               flowId: { type: string }
 *               name: { type: string }
 */
router.get('/', listExecutions);
router.get('/:id', getExecution);
router.post('/', startExecution);
router.post('/:id/cancel', cancelExecution);
router.post('/:id/archive', archiveExecution);

export default router;
