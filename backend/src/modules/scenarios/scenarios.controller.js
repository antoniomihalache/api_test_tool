import { ScenariosService } from './scenarios.service.js';

const svc = new ScenariosService();

export async function listScenarios(req, res, next) {
  try {
    const data = await svc.list(req.query.serviceId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getScenario(req, res, next) {
  try {
    const data = await svc.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createScenario(req, res, next) {
  try {
    const data = await svc.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateScenario(req, res, next) {
  try {
    const data = await svc.update(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteScenario(req, res, next) {
  try {
    await svc.delete(req.params.id);
    res.json({ success: true, message: 'Scenario deleted' });
  } catch (err) {
    next(err);
  }
}
