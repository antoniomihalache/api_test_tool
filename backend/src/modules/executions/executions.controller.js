import { ExecutionsService, ReportsService } from './executions.service.js';
import { LaunchService } from './launch.service.js';

const executionsSvc = new ExecutionsService();
const reportsSvc = new ReportsService();
const launchSvc = new LaunchService();

// Executions

export async function listExecutions(req, res, next) {
  try {
    const filters = {
      serviceId: req.query.serviceId,
      status: req.query.status,
    };
    const data = await executionsSvc.list(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getExecution(req, res, next) {
  try {
    const data = await executionsSvc.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createExecution(req, res, next) {
  try {
    const data = await executionsSvc.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getExecutionScript(req, res, next) {
  try {
    const data = await executionsSvc.getById(req.params.id);
    res.type('text/plain').send(data.k6Script || '// script not available');
  } catch (err) {
    next(err);
  }
}

export async function launchExecution(req, res, next) {
  try {
    const { scenarioId } = req.body;
    if (!scenarioId) return res.status(400).json({ success: false, error: 'scenarioId is required' });
    const data = await launchSvc.launchScenario(scenarioId, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateExecutionMetrics(req, res, next) {
  try {
    const data = await executionsSvc.updateMetrics(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function cancelExecution(req, res, next) {
  try {
    const data = await launchSvc.cancel(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// Reports

export async function listReports(req, res, next) {
  try {
    const filters = {
      serviceId: req.query.serviceId,
      executionId: req.query.executionId,
    };
    const data = await reportsSvc.list(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getReportByExecution(req, res, next) {
  try {
    const data = await reportsSvc.getByExecutionId(req.params.executionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createReport(req, res, next) {
  try {
    const data = await reportsSvc.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function downloadReportCsv(req, res, next) {
  try {
    const csv = await reportsSvc.generateCsv(req.params.reportId);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="report.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
