import mongoose from 'mongoose';

const AssertionSchema = new mongoose.Schema({
  type: { type: String, enum: ['status', 'latency', 'body', 'header'], required: true },
  operator: { type: String, enum: ['eq', 'lt', 'gt', 'contains'], required: true },
  value: mongoose.Schema.Types.Mixed,
}, { _id: false });

const ExtractVarSchema = new mongoose.Schema({
  name: { type: String, required: true },
  jsonPath: { type: String, required: true },
}, { _id: false });

const StepSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], required: true },
  path: { type: String, required: true },
  headers: { type: Map, of: String },
  body: String,
  extractVars: { type: [ExtractVarSchema], default: [] },
  assertions: { type: [AssertionSchema], default: [] },
  condition: String,
}, { _id: false });

const FlowSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  environment: { type: String, enum: ['dev', 'qa', 'staging', 'production'], required: true },
  authConfigId: mongoose.Schema.Types.ObjectId,
  vus: { type: Number, required: true, min: 1 },
  duration: { type: String, required: true },
  steps: { type: [StepSchema], default: [] },
}, { timestamps: true });

FlowSchema.index({ serviceId: 1 });

export const FlowModel = mongoose.model('Flow', FlowSchema);
