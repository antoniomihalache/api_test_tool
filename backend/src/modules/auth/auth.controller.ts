import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { ApiResponse } from '../../types/index.js';

const svc = new AuthService();

// ── Platform login ────────────────────────────────────────────

export async function login(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw Object.assign(new Error('email and password required'), { statusCode: 400 });
    const data = await svc.login(email, password);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── Auth config CRUD ─────────────────────────────────────────

export async function listAuthConfigs(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.listConfigs();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAuthConfig(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.getConfigById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createAuthConfig(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.createConfig(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateAuthConfig(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.updateConfig(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteAuthConfig(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    await svc.deleteConfig(req.params.id);
    res.json({ success: true, message: 'Auth config deleted' });
  } catch (err) {
    next(err);
  }
}
