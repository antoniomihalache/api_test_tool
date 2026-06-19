import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service.js';
import { ApiResponse, ReportFormat } from '../../types/index.js';
import path from 'path';

const svc = new ReportsService();

export async function listAllReports(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const data = await svc.listAll(limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listReports(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await svc.listByExecution(req.params.executionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function generateReport(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const { format = 'json' } = req.body as { format?: ReportFormat };
    const data = await svc.generate(req.params.executionId, format);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function downloadReport(req: Request, res: Response, next: NextFunction) {
  try {
    const filePath = await svc.getFilePath(req.params.id);
    const ext = path.extname(filePath).slice(1);
    const mimeMap: Record<string, string> = {
      json: 'application/json',
      csv: 'text/csv',
      html: 'text/html',
    };
    res.setHeader('Content-Type', mimeMap[ext] ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}
