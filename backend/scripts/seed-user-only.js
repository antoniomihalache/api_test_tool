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
const RESET_APP_DATA = process.env.RESET_APP_DATA === '1';

async function seedDefaultUserOnly() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  if (RESET_APP_DATA) {
    // Optional reset mode for clean-slate local testing.
    await Promise.all([
      ServiceModel.deleteMany({}),
      ScenarioModel.deleteMany({}),
      FlowModel.deleteMany({}),
      AuthConfigModel.deleteMany({}),
      ExecutionModel.deleteMany({}),
      ReportModel.deleteMany({}),
      UserModel.deleteMany({ email: { $ne: DEFAULT_EMAIL } }),
    ]);
    console.log('Reset mode enabled: cleared app data before seeding default user');
  }

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

  if (RESET_APP_DATA) {
    console.log('Seed complete: reset app data + ensured default user');
  } else {
    console.log('Seed complete: ensured default user (existing data preserved)');
  }
  await mongoose.disconnect();
}

seedDefaultUserOnly().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
