import { ExecutionModel, ReportModel } from './executions.model.js';
import { createError } from '../../middleware/error.middleware.js';

export class ExecutionsService {
  async list(filters = {}) {
    const dbFilters = {};
    if (filters.serviceId) dbFilters.serviceId = filters.serviceId;
    if (filters.status) dbFilters.status = filters.status;
    return ExecutionModel.find(dbFilters).sort({ createdAt: -1 }).limit(100).lean();
  }

  async getById(id) {
    const execution = await ExecutionModel.findById(id).lean();
    if (!execution) throw createError('Execution not found', 404);
    return execution;
  }

  async create(data) {
    const execution = await ExecutionModel.create(data);
    return execution.toObject();
  }

  async updateStatus(id, status) {
    const execution = await ExecutionModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!execution) throw createError('Execution not found', 404);
    return execution;
  }

  async updateMetrics(id, metrics) {
    const execution = await ExecutionModel.findByIdAndUpdate(
      id,
      { ...metrics, status: 'completed', endTime: new Date() },
      { new: true },
    ).lean();
    if (!execution) throw createError('Execution not found', 404);
    return execution;
  }

  async cancel(id) {
    const execution = await ExecutionModel.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true }).lean();
    if (!execution) throw createError('Execution not found', 404);
    return execution;
  }
}

export class ReportsService {
  async list(filters = {}) {
    const dbFilters = {};
    if (filters.serviceId) dbFilters.serviceId = filters.serviceId;
    if (filters.executionId) dbFilters.executionId = filters.executionId;
    return ReportModel.find(dbFilters).sort({ createdAt: -1 }).lean();
  }

  async getByExecutionId(executionId) {
    const report = await ReportModel.findOne({ executionId }).lean();
    if (!report) throw createError('Report not found', 404);
    return report;
  }

  async create(data) {
    const report = await ReportModel.create(data);
    return report.toObject();
  }

  async generateCsv(reportId) {
    const report = await ReportModel.findById(reportId).lean();
    if (!report) throw createError('Report not found', 404);
    const metrics = JSON.parse(report.metricsJson || '{}');
    let csv = 'Metric,Value\n';
    Object.entries(metrics).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });
    return csv;
  }
}
