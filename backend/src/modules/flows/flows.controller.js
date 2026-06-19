import { FlowsService } from './flows.service.js';

const svc = new FlowsService();

export async function listFlows(req, res, next) {
  try {
    const data = await svc.list(req.query.serviceId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getFlow(req, res, next) {
  try {
    const data = await svc.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createFlow(req, res, next) {
  try {
    const data = await svc.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateFlow(req, res, next) {
  try {
    const data = await svc.update(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteFlow(req, res, next) {
  try {
    await svc.delete(req.params.id);
    res.json({ success: true, message: 'Flow deleted' });
  } catch (err) {
    next(err);
  }
}
