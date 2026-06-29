import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcryptjs.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.comparePassword = async function(plainPassword) {
  return bcryptjs.compare(plainPassword, this.password);
};

const AuthConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['none', 'bearer', 'jwt', 'oauth2', 'basic', 'custom'], required: true },
  loginEndpoint: String,
  loginHeaders: { type: Map, of: String },
  loginBody: mongoose.Schema.Types.Mixed,
  tokenExtractPath: { type: String, default: 'access_token' },
  tokenHeaderName: { type: String, default: 'Authorization' },
  refreshEndpoint: String,
  refreshTokenPath: { type: String, default: 'refresh_token' },
  staticToken: String,
  username: String,
  password: String,
  loginBodyEncoding: { type: String, enum: ['json', 'form'], default: 'json' },
  otpMode: { type: String, enum: ['none', 'code', 'secret'], default: 'none' },
  otpRequired: { type: Boolean, default: false },
  otpFieldName: { type: String, default: 'totp' },
  otpSecret: String,
}, { timestamps: true });

export const UserModel = mongoose.model('User', UserSchema);
export const AuthConfigModel = mongoose.model('AuthConfig', AuthConfigSchema);
