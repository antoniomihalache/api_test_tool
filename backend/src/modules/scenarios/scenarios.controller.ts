import { Request, Response, NextFunction } from 'express';
import { ScenariosService } from './scenarios.service.js';
import { ApiResponse } from '../../types/index.js';

const svc = new ScenariosService();

export async function listScenarios(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.list(req.query.serviceId as string | undefined);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getScenario(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createScenario(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateScenario(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.update(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteScenario(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    await svc.delete(req.params.id);
    res.json({ success: true, message: 'Scenario deleted' });
  } catch (err) {
    next(err);
  }
}
