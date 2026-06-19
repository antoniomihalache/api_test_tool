import mongoose, { Schema, Document } from 'mongoose';
import { IExecution } from '../../types/index.js';

export interface ExecutionDocument
  extends Omit<IExecution, 'id' | 'serviceId' | 'scenarioId' | 'flowId'>,
    Document {
  serviceId: mongoose.Types.ObjectId;
  scenarioId?: mongoose.Types.ObjectId;
  flowId?: mongoose.Types.ObjectId;
}

const MetricsSummarySchema = new Schema(
  {
    p50: Number,
    p90: Number,
    p95: Number,
    p99: Number,
    avg: Number,
    min: Number,
    max: Number,
    rps: Number,
    totalRequests: Number,
    errorRate: Number,
    successRate: Number,
  },
  { _id: false },
);

const ExecutionSchema = new Schema<ExecutionDocument>(
  {
    name: String,
    scenarioId: { type: Schema.Types.ObjectId, ref: 'Scenario' },
    flowId: { type: Schema.Types.ObjectId, ref: 'Flow' },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    environment: {
      type: String,
      enum: ['dev', 'qa', 'staging', 'production'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'archived'],
      default: 'pending',
    },
    runnerMode: { type: String, enum: ['docker', 'kubernetes'], required: true },
    containerId: String,
    k8sJobName: String,
    startedAt: Date,
    completedAt: Date,
    metrics: MetricsSummarySchema,
    reportPath: String,
    logs: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ExecutionSchema.index({ serviceId: 1, createdAt: -1 });
ExecutionSchema.index({ status: 1 });
ExecutionSchema.index({ scenarioId: 1 });

export const ExecutionModel = mongoose.model<ExecutionDocument>('Execution', ExecutionSchema);
