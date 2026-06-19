import { Router } from 'express';
import { listFlows, getFlow, createFlow, updateFlow, deleteFlow } from './flows.controller.js';

const router = Router();

router.get('/', listFlows);
router.get('/:id', getFlow);
router.post('/', createFlow);
router.put('/:id', updateFlow);
router.delete('/:id', deleteFlow);

export default router;
