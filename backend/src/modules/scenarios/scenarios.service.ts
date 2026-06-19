import { ScenarioModel } from './scenarios.model.js';
import { createError } from '../../middleware/error.middleware.js';
import { IScenario } from '../../types/index.js';

export class ScenariosService {
  async list(serviceId?: string): Promise<IScenario[]> {
    const filter = serviceId ? { serviceId } : {};
    return ScenarioModel.find(filter).sort({ createdAt: -1 }).lean<IScenario[]>();
  }

  async getById(id: string): Promise<IScenario> {
    const scenario = await ScenarioModel.findById(id).lean<IScenario>();
    if (!scenario) throw createError('Scenario not found', 404);
    return scenario;
  }

  async create(data: Partial<IScenario>): Promise<IScenario> {
    const scenario = await ScenarioModel.create(data);
    return scenario.toObject() as unknown as IScenario;
  }

  async update(id: string, data: Partial<IScenario>): Promise<IScenario> {
    const scenario = await ScenarioModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean<IScenario>();
    if (!scenario) throw createError('Scenario not found', 404);
    return scenario;
  }

  async delete(id: string): Promise<void> {
    const result = await ScenarioModel.findByIdAndDelete(id);
    if (!result) throw createError('Scenario not found', 404);
  }
}
