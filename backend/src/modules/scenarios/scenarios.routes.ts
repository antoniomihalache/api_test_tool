import { Router } from 'express';
import {
  listScenarios,
  getScenario,
  createScenario,
  updateScenario,
  deleteScenario,
} from './scenarios.controller.js';

const router = Router();

router.get('/', listScenarios);
router.get('/:id', getScenario);
router.post('/', createScenario);
router.put('/:id', updateScenario);
router.delete('/:id', deleteScenario);

export default router;
