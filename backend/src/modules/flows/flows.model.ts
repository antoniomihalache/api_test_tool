import mongoose, { Schema, Document } from 'mongoose';
import { IFlow } from '../../types/index.js';

export interface FlowDocument
  extends Omit<IFlow, 'id' | 'serviceId' | 'authConfigId'>,
    Document {
  serviceId: mongoose.Types.ObjectId;
  authConfigId?: mongoose.Types.ObjectId;
}

const AssertionSchema = new Schema(
  {
    type: { type: String, enum: ['status', 'latency', 'body', 'header'], required: true },
    operator: { type: String, enum: ['eq', 'lt', 'gt', 'contains'], required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const ExtractVarSchema = new Schema(
  {
    name: { type: String, required: true },
    jsonPath: { type: String, required: true },
  },
  { _id: false },
);

const StepSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      required: true,
    },
    path: { type: String, required: true },
    headers: { type: Map, of: String },
    body: String,
    extractVars: { type: [ExtractVarSchema], default: [] },
    assertions: { type: [AssertionSchema], default: [] },
    condition: String,
  },
  { _id: false },
);

const FlowSchema = new Schema<FlowDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    environment: {
      type: String,
      enum: ['dev', 'qa', 'staging', 'production'],
      required: true,
    },
    authConfigId: { type: Schema.Types.ObjectId, ref: 'AuthConfig' },
    vus: { type: Number, required: true, min: 1 },
    duration: { type: String, required: true },
    steps: { type: [StepSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

FlowSchema.index({ serviceId: 1 });

export const FlowModel = mongoose.model<FlowDocument>('Flow', FlowSchema);
