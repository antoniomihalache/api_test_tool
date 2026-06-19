import mongoose from 'mongoose';

const ServiceEnvironmentSchema = new mongoose.Schema({
  name: { type: String, enum: ['dev', 'qa', 'staging', 'production'], required: true },
  baseUrl: { type: String, required: true },
}, { _id: false });

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  environments: { type: [ServiceEnvironmentSchema], required: true },
  namespace: String,
  tags: { type: [String], default: [] },
  authConfigId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

ServiceSchema.index({ name: 1 });
ServiceSchema.index({ tags: 1 });

export const ServiceModel = mongoose.model('Service', ServiceSchema);
