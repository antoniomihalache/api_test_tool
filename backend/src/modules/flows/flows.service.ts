import { FlowModel } from './flows.model.js';
import { createError } from '../../middleware/error.middleware.js';
import { IFlow } from '../../types/index.js';

export class FlowsService {
  async list(serviceId?: string): Promise<IFlow[]> {
    const filter = serviceId ? { serviceId } : {};
    return FlowModel.find(filter).sort({ createdAt: -1 }).lean<IFlow[]>();
  }

  async getById(id: string): Promise<IFlow> {
    const flow = await FlowModel.findById(id).lean<IFlow>();
    if (!flow) throw createError('Flow not found', 404);
    return flow;
  }

  async create(data: Partial<IFlow>): Promise<IFlow> {
    const flow = await FlowModel.create(data);
    return flow.toObject() as unknown as IFlow;
  }

  async update(id: string, data: Partial<IFlow>): Promise<IFlow> {
    const flow = await FlowModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean<IFlow>();
    if (!flow) throw createError('Flow not found', 404);
    return flow;
  }

  async delete(id: string): Promise<void> {
    const result = await FlowModel.findByIdAndDelete(id);
    if (!result) throw createError('Flow not found', 404);
  }
}
