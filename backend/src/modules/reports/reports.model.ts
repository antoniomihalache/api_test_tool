import mongoose, { Schema, Document } from 'mongoose';
import { IReport } from '../../types/index.js';

export interface ReportDocument extends Omit<IReport, 'id' | 'executionId'>, Document {
  executionId: mongoose.Types.ObjectId;
}

const ReportSchema = new Schema<ReportDocument>(
  {
    executionId: { type: Schema.Types.ObjectId, ref: 'Execution', required: true },
    format: { type: String, enum: ['html', 'json', 'csv'], required: true },
    filePath: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ReportSchema.index({ executionId: 1 });

export const ReportModel = mongoose.model<ReportDocument>('Report', ReportSchema);
