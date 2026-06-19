import mongoose from 'mongoose';

const AssertionSchema = new mongoose.Schema({
  type: { type: String, enum: ['status', 'latency', 'body', 'header'], required: true },
  operator: { type: String, enum: ['eq', 'lt', 'gt', 'contains'], required: true },
  value: mongoose.Schema.Types.Mixed,
}, { _id: false });

const RequestSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], required: true },
  path: { type: String, required: true },
  headers: { type: Map, of: String },
  body: String,
  assertions: { type: [AssertionSchema], default: [] },
}, { _id: false });

const StageSchema = new mongoose.Schema({
  duration: { type: String, required: true },
  target: { type: Number, required: true },
}, { _id: false });

const ThresholdSchema = new mongoose.Schema({
  metric: { type: String, required: true },
  condition: { type: String, required: true },
}, { _id: false });

const ScenarioSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  type: { type: String, enum: ['smoke', 'load', 'stress', 'spike', 'soak', 'custom'], required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  environment: { type: String, enum: ['dev', 'qa', 'staging', 'production'], required: true },
  authConfigId: mongoose.Schema.Types.ObjectId,
  vus: { type: Number, required: true, min: 1 },
  duration: { type: String, required: true },
  stages: [StageSchema],
  thresholds: { type: [ThresholdSchema], default: [] },
  requests: { type: [RequestSchema], default: [] },
}, { timestamps: true });

ScenarioSchema.index({ serviceId: 1 });
ScenarioSchema.index({ type: 1 });

export const ScenarioModel = mongoose.model('Scenario', ScenarioSchema);
