import mongoose from 'mongoose';

const MetricDataPointSchema = new mongoose.Schema({
  timestamp: { type: Number, required: true },
  value: { type: Number, required: true },
}, { _id: false });

const ExecutionSchema = new mongoose.Schema({
  scenarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scenario' },
  flowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flow' },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'archived'],
    default: 'pending',
  },
  runnerId: String,
  runnerMode: { type: String, enum: ['docker', 'kubernetes'], default: 'docker' },
  startTime: Date,
  endTime: Date,
  duration: Number,
  k6Script: String,
  logOutput: String,
  vus: Number,
  iterationCount: Number,
  failureRate: Number,
  p95Latency: Number,
  p99Latency: Number,
  avgLatency: Number,
  rps: Number,
}, { timestamps: true });

ExecutionSchema.index({ serviceId: 1, status: 1 });
ExecutionSchema.index({ scenarioId: 1 });
ExecutionSchema.index({ flowId: 1 });

const ReportSchema = new mongoose.Schema({
  executionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Execution', required: true },
  scenarioId: mongoose.Schema.Types.ObjectId,
  flowId: mongoose.Schema.Types.ObjectId,
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  metricsJson: String,
  p50Latency: Number,
  p95Latency: Number,
  p99Latency: Number,
  p999Latency: Number,
  maxLatency: Number,
  minLatency: Number,
  avgLatency: Number,
  rps: Number,
  totalRequests: Number,
  failedRequests: Number,
  passedAssertions: Number,
  failedAssertions: Number,
  reportPath: String,
}, { timestamps: true });

ReportSchema.index({ executionId: 1 });
ReportSchema.index({ serviceId: 1 });

export const ExecutionModel = mongoose.model('Execution', ExecutionSchema);
export const ReportModel = mongoose.model('Report', ReportSchema);
