import { Router } from 'express';
import {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
} from './services.controller.js';

const router = Router();

/**
 * @openapi
 * /services:
 *   get:
 *     summary: List all services
 *     parameters:
 *       - name: tags
 *         in: query
 *         schema: { type: string }
 *         description: Comma-separated tags to filter by
 *   post:
 *     summary: Create a service
 */
router.get('/', listServices);
router.get('/:id', getService);
router.post('/', createService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

export default router;
