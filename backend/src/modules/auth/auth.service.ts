import { AuthConfigModel } from './auth.model.js';
import { UserModel } from './user.model.js';
import { createError } from '../../middleware/error.middleware.js';
import { config } from '../../config/index.js';
import { AuthConfig } from '../../types/index.js';
import jwt from 'jsonwebtoken';

export class AuthService {
  // ── User auth (platform login) ────────────────────────────

  async login(email: string, password: string): Promise<{ token: string; user: object }> {
    const user = await UserModel.findOne({ email }).select('+password');
    if (!user) throw createError('Invalid credentials', 401);

    const valid = await user.comparePassword(password);
    if (!valid) throw createError('Invalid credentials', 401);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );

    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  // ── Auth configs (for target service auth) ────────────────

  async listConfigs(): Promise<AuthConfig[]> {
    return AuthConfigModel.find().sort({ createdAt: -1 }).lean<AuthConfig[]>();
  }

  async getConfigById(id: string): Promise<AuthConfig> {
    const cfg = await AuthConfigModel.findById(id).lean<AuthConfig>();
    if (!cfg) throw createError('Auth config not found', 404);
    return cfg;
  }

  async createConfig(data: Partial<AuthConfig>): Promise<AuthConfig> {
    const cfg = await AuthConfigModel.create(data);
    return cfg.toObject() as unknown as AuthConfig;
  }

  async updateConfig(id: string, data: Partial<AuthConfig>): Promise<AuthConfig> {
    const cfg = await AuthConfigModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean<AuthConfig>();
    if (!cfg) throw createError('Auth config not found', 404);
    return cfg;
  }

  async deleteConfig(id: string): Promise<void> {
    const result = await AuthConfigModel.findByIdAndDelete(id);
    if (!result) throw createError('Auth config not found', 404);
  }
}
