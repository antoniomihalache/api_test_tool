import { ServiceModel } from './services.model.js';
import { createError } from '../../middleware/error.middleware.js';

export class ServicesService {
  async list(tags) {
    const filter = tags?.length ? { tags: { $in: tags } } : {};
    return ServiceModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getById(id) {
    const service = await ServiceModel.findById(id).lean();
    if (!service) throw createError('Service not found', 404);
    return service;
  }

  async create(data) {
    const service = await ServiceModel.create(data);
    return service.toObject();
  }

  async update(id, data) {
    const service = await ServiceModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    if (!service) throw createError('Service not found', 404);
    return service;
  }

  async delete(id) {
    const result = await ServiceModel.findByIdAndDelete(id);
    if (!result) throw createError('Service not found', 404);
  }
}
