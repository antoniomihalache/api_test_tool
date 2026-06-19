import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import mongoose from 'mongoose';
import { ServiceModel } from '../src/modules/services/services.model.js';
import { ScenarioModel } from '../src/modules/scenarios/scenarios.model.js';
import { FlowModel } from '../src/modules/flows/flows.model.js';
import { AuthConfigModel, UserModel } from '../src/modules/auth/auth.model.js';
import { ExecutionModel, ReportModel } from '../src/modules/executions/executions.model.js';

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/perf_platform';
const DEFAULT_EMAIL = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@perf-platform.local';
const DEFAULT_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? 'Admin1234!';

async function seedDefaultUserOnly() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Keep bootstrap predictable: clear seeded app data and keep only the default login user.
  await Promise.all([
    ServiceModel.deleteMany({}),
    ScenarioModel.deleteMany({}),
    FlowModel.deleteMany({}),
    AuthConfigModel.deleteMany({}),
    ExecutionModel.deleteMany({}),
    ReportModel.deleteMany({}),
    UserModel.deleteMany({ email: { $ne: DEFAULT_EMAIL } }),
  ]);

  let admin = await UserModel.findOne({ email: DEFAULT_EMAIL });
  if (!admin) {
    admin = await UserModel.create({
      email: DEFAULT_EMAIL,
      password: DEFAULT_PASSWORD,
      role: 'admin',
    });
    console.log(`Created default admin user: ${admin.email}`);
  } else {
    admin.password = DEFAULT_PASSWORD;
    admin.role = 'admin';
    await admin.save();
    console.log(`Updated default admin user: ${admin.email}`);
  }

  console.log('Seed complete: default user only (no services/scenarios/flows)');
  await mongoose.disconnect();
}

seedDefaultUserOnly().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
