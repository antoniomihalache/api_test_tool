import { Request, Response, NextFunction } from 'express';
import { ExecutionsService } from './executions.service.js';
import { ApiResponse } from '../../types/index.js';

const svc = new ExecutionsService();

export async function listExecutions(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const { status, serviceId, limit } = req.query;
    const data = await svc.list({
      status: status as string | undefined,
      serviceId: serviceId as string | undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getExecution(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function startExecution(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.start(req.body);
    res.status(202).json({ success: true, data, message: 'Execution started' });
  } catch (err) {
    next(err);
  }
}

export async function cancelExecution(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.cancel(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function archiveExecution(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.archive(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
