import mongoose, { Schema, Document } from 'mongoose';
import { IService } from '../../types/index.js';

export interface ServiceDocument extends Omit<IService, 'id'>, Document {}

const EnvironmentSchema = new Schema(
  {
    name: { type: String, enum: ['dev', 'qa', 'staging', 'production'], required: true },
    baseUrl: { type: String, required: true },
  },
  { _id: false },
);

const ServiceSchema = new Schema<ServiceDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    environments: { type: [EnvironmentSchema], required: true, default: [] },
    namespace: { type: String },
    tags: { type: [String], default: [] },
    authConfigId: { type: Schema.Types.ObjectId, ref: 'AuthConfig' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ServiceSchema.index({ name: 1 });
ServiceSchema.index({ tags: 1 });

export const ServiceModel = mongoose.model<ServiceDocument>('Service', ServiceSchema);
