import fs from 'fs/promises';
import path from 'path';
import { ReportModel } from './reports.model.js';
import { ExecutionModel } from '../executions/executions.model.js';
import { createError } from '../../middleware/error.middleware.js';
import { config } from '../../config/index.js';
import { IReport, ReportFormat } from '../../types/index.js';

export class ReportsService {
  async listAll(limit = 100): Promise<IReport[]> {
    return ReportModel.find().sort({ createdAt: -1 }).limit(limit).lean<IReport[]>();
  }

  async listByExecution(executionId: string): Promise<IReport[]> {
    return ReportModel.find({ executionId }).lean<IReport[]>();
  }

  async generate(executionId: string, format: ReportFormat): Promise<IReport> {
    const execution = await ExecutionModel.findById(executionId).lean();
    if (!execution) throw createError('Execution not found', 404);
    if (execution.status !== 'completed' && execution.status !== 'failed') {
      throw createError('Execution has not finished yet', 400);
    }

    await fs.mkdir(config.REPORTS_PATH, { recursive: true });
    const fileName = `report-${executionId}-${Date.now()}.${format}`;
    const filePath = path.join(config.REPORTS_PATH, fileName);

    const content = this.buildContent(execution, format);
    await fs.writeFile(filePath, content, 'utf8');

    const report = await ReportModel.create({ executionId, format, filePath });
    return report.toObject() as unknown as IReport;
  }

  async getFilePath(id: string): Promise<string> {
    const report = await ReportModel.findById(id).lean<IReport>();
    if (!report) throw createError('Report not found', 404);
    try {
      await fs.access(report.filePath);
    } catch {
      throw createError('Report file not found on disk', 404);
    }
    return report.filePath;
  }

  private buildContent(execution: Record<string, unknown>, format: ReportFormat): string {
    const metrics = (execution.metrics as Record<string, number>) ?? {};

    if (format === 'json') {
      return JSON.stringify(
        {
          executionId: execution._id,
          status: execution.status,
          environment: execution.environment,
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
          metrics,
        },
        null,
        2,
      );
    }

    if (format === 'csv') {
      const rows = [
        'metric,value',
        ...Object.entries(metrics).map(([k, v]) => `${k},${v}`),
      ];
      return rows.join('\n');
    }

    // HTML report
    const metricRows = Object.entries(metrics)
      .map(([k, v]) => `<tr><td>${k}</td><td>${typeof v === 'number' ? v.toFixed(2) : v}</td></tr>`)
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Performance Report – ${execution._id}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; color: #1e293b; }
    h1 { color: #0f172a; }
    .badge { display: inline-block; padding: .25rem .75rem; border-radius: 9999px; font-size: .875rem; }
    .completed { background: #dcfce7; color: #15803d; }
    .failed { background: #fee2e2; color: #b91c1c; }
    table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
    th, td { text-align: left; padding: .75rem 1rem; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Performance Report</h1>
  <p>Execution ID: <code>${execution._id}</code></p>
  <p>Status: <span class="badge ${execution.status}">${execution.status}</span></p>
  <p>Environment: ${execution.environment}</p>
  <p>Started: ${execution.startedAt}</p>
  <p>Completed: ${execution.completedAt}</p>
  <table>
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>${metricRows}</tbody>
  </table>
</body>
</html>`;
  }
}
