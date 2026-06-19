import { Request, Response, NextFunction } from 'express';
import { ServicesService } from './services.service.js';
import { ApiResponse } from '../../types/index.js';

const svc = new ServicesService();

export async function listServices(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const tags = req.query.tags ? String(req.query.tags).split(',') : undefined;
    const data = await svc.list(tags);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getService(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createService(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateService(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.update(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteService(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    await svc.delete(req.params.id);
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) {
    next(err);
  }
}
