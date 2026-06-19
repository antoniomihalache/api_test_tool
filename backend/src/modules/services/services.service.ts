import { ServiceModel } from './services.model.js';
import { createError } from '../../middleware/error.middleware.js';
import { IService } from '../../types/index.js';

export class ServicesService {
  async list(tags?: string[]): Promise<IService[]> {
    const filter = tags?.length ? { tags: { $in: tags } } : {};
    return ServiceModel.find(filter).sort({ createdAt: -1 }).lean<IService[]>();
  }

  async getById(id: string): Promise<IService> {
    const service = await ServiceModel.findById(id).lean<IService>();
    if (!service) throw createError('Service not found', 404);
    return service;
  }

  async create(data: Partial<IService>): Promise<IService> {
    const service = await ServiceModel.create(data);
    return service.toObject() as unknown as IService;
  }

  async update(id: string, data: Partial<IService>): Promise<IService> {
    const service = await ServiceModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean<IService>();
    if (!service) throw createError('Service not found', 404);
    return service;
  }

  async delete(id: string): Promise<void> {
    const result = await ServiceModel.findByIdAndDelete(id);
    if (!result) throw createError('Service not found', 404);
  }
}
