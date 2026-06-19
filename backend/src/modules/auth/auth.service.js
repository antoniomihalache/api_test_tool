import jwt from 'jsonwebtoken';
import { UserModel, AuthConfigModel } from './auth.model.js';
import { config } from '../../config/index.js';
import { createError } from '../../middleware/error.middleware.js';

export class AuthService {
  async login(email, password) {
    const user = await UserModel.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throw createError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN },
    );

    return { token, user: { id: user._id, email: user.email, role: user.role } };
  }

  async listConfigs() {
    return AuthConfigModel.find().sort({ createdAt: -1 }).lean();
  }

  async getConfigById(id) {
    const config = await AuthConfigModel.findById(id).lean();
    if (!config) throw createError('Auth config not found', 404);
    return config;
  }

  async createConfig(data) {
    const config = await AuthConfigModel.create(data);
    return config.toObject();
  }

  async updateConfig(id, data) {
    const config = await AuthConfigModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    if (!config) throw createError('Auth config not found', 404);
    return config;
  }

  async deleteConfig(id) {
    const result = await AuthConfigModel.findByIdAndDelete(id);
    if (!result) throw createError('Auth config not found', 404);
  }
}
