import { Request, Response, NextFunction } from 'express';
import { FlowsService } from './flows.service.js';
import { ApiResponse } from '../../types/index.js';

const svc = new FlowsService();

export async function listFlows(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.list(req.query.serviceId as string | undefined);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getFlow(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createFlow(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateFlow(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.update(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteFlow(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    await svc.delete(req.params.id);
    res.json({ success: true, message: 'Flow deleted' });
  } catch (err) {
    next(err);
  }
}
