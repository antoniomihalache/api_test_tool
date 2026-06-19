import { FlowModel } from './flows.model.js';
import { createError } from '../../middleware/error.middleware.js';

export class FlowsService {
  async list(serviceId) {
    const filter = serviceId ? { serviceId } : {};
    return FlowModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getById(id) {
    const flow = await FlowModel.findById(id).lean();
    if (!flow) throw createError('Flow not found', 404);
    return flow;
  }

  async create(data) {
    const flow = await FlowModel.create(data);
    return flow.toObject();
  }

  async update(id, data) {
    const flow = await FlowModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    if (!flow) throw createError('Flow not found', 404);
    return flow;
  }

  async delete(id) {
    const result = await FlowModel.findByIdAndDelete(id);
    if (!result) throw createError('Flow not found', 404);
  }
}
