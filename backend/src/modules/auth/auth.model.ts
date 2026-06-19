import mongoose, { Schema, Document } from 'mongoose';
import { AuthConfig } from '../../types/index.js';

export interface AuthConfigDocument extends Omit<AuthConfig, 'id'>, Document {}

const AuthConfigSchema = new Schema<AuthConfigDocument>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['none', 'bearer', 'jwt', 'oauth2', 'basic', 'custom'],
      required: true,
    },
    loginEndpoint: String,
    loginHeaders: { type: Map, of: String },
    loginBody: { type: Map, of: Schema.Types.Mixed },
    tokenExtractPath: String,
    tokenHeaderName: String,
    refreshEndpoint: String,
    refreshTokenPath: String,
    // NOTE: staticToken and password are stored; ensure MongoDB is secured at the infra level
    staticToken: String,
    username: String,
    password: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Do not expose sensitive fields in JSON output
AuthConfigSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.staticToken;
    delete ret.password;
    return ret;
  },
});

export const AuthConfigModel = mongoose.model<AuthConfigDocument>('AuthConfig', AuthConfigSchema);
