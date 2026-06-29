import { ScenarioModel } from './scenarios.model.js';
import { createError } from '../../middleware/error.middleware.js';

export class ScenariosService {
  sanitizePayload(data) {
    const payload = { ...data };
    if (payload.authConfigId === '' || payload.authConfigId === null) {
      delete payload.authConfigId;
    }
    return payload;
  }

  async list(serviceId) {
    const filter = serviceId ? { serviceId } : {};
    return ScenarioModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getById(id) {
    const scenario = await ScenarioModel.findById(id).lean();
    if (!scenario) throw createError('Scenario not found', 404);
    return scenario;
  }

  async create(data) {
    const scenario = await ScenarioModel.create(this.sanitizePayload(data));
    return scenario.toObject();
  }

  async update(id, data) {
    const scenario = await ScenarioModel.findByIdAndUpdate(id, this.sanitizePayload(data), { new: true, runValidators: true }).lean();
    if (!scenario) throw createError('Scenario not found', 404);
    return scenario;
  }

  async delete(id) {
    const result = await ScenarioModel.findByIdAndDelete(id);
    if (!result) throw createError('Scenario not found', 404);
  }
}
