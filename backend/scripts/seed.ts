import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import mongoose from 'mongoose';
import { ServiceModel } from '../src/modules/services/services.model.js';
import { ScenarioModel } from '../src/modules/scenarios/scenarios.model.js';
import { FlowModel } from '../src/modules/flows/flows.model.js';
import { AuthConfigModel } from '../src/modules/auth/auth.model.js';
import { UserModel } from '../src/modules/auth/user.model.js';

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/perf_platform';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clean slate
  await Promise.all([
    ServiceModel.deleteMany({}),
    ScenarioModel.deleteMany({}),
    FlowModel.deleteMany({}),
    AuthConfigModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);

  // Admin user
  const admin = await UserModel.create({
    email: 'admin@perf-platform.local',
    password: 'Admin1234!',
    role: 'admin',
  });
  console.log(`Created admin user: ${admin.email}`);

  // Auth config
  const bearerAuth = await AuthConfigModel.create({
    name: 'Orders API Bearer Auth',
    type: 'bearer',
    loginEndpoint: '/auth/login',
    loginBody: { username: 'test_user', password: 'test_pass' },
    tokenExtractPath: 'data.token',
    tokenHeaderName: 'Authorization',
  });

  // Services
  const ordersService = await ServiceModel.create({
    name: 'Orders API',
    description: 'Core order management service',
    environments: [
      { name: 'dev', baseUrl: 'http://orders-dev.internal' },
      { name: 'qa', baseUrl: 'http://orders-qa.internal' },
      { name: 'staging', baseUrl: 'http://orders-staging.internal' },
      { name: 'production', baseUrl: 'http://orders.internal' },
    ],
    namespace: 'orders',
    tags: ['core', 'orders'],
    authConfigId: bearerAuth._id,
  });

  await ServiceModel.create({
    name: 'Users API',
    description: 'User management and profiles',
    environments: [
      { name: 'dev', baseUrl: 'http://users-dev.internal' },
      { name: 'qa', baseUrl: 'http://users-qa.internal' },
    ],
    namespace: 'users',
    tags: ['core', 'users'],
  });

  await ServiceModel.create({
    name: 'Payments API',
    description: 'Payment processing service',
    environments: [
      { name: 'staging', baseUrl: 'http://payments-staging.internal' },
      { name: 'production', baseUrl: 'http://payments.internal' },
    ],
    namespace: 'payments',
    tags: ['core', 'payments', 'critical'],
  });

  // Smoke scenario
  await ScenarioModel.create({
    name: 'Orders API Smoke Test',
    description: 'Quick sanity check for orders service',
    type: 'smoke',
    serviceId: ordersService._id,
    environment: 'qa',
    authConfigId: bearerAuth._id,
    vus: 2,
    duration: '1m',
    thresholds: [
      { metric: 'http_req_failed', condition: 'rate<0.01' },
      { metric: 'http_req_duration', condition: 'p(99)<200' },
    ],
    requests: [
      {
        id: 'list-orders',
        name: 'List Orders',
        method: 'GET',
        path: '/orders',
        assertions: [
          { type: 'status', operator: 'eq', value: 200 },
          { type: 'latency', operator: 'lt', value: 500 },
        ],
      },
    ],
  });

  // Load scenario
  await ScenarioModel.create({
    name: 'Orders API Load Test',
    description: '30-minute sustained load test',
    type: 'load',
    serviceId: ordersService._id,
    environment: 'qa',
    authConfigId: bearerAuth._id,
    vus: 50,
    duration: '30m',
    stages: [
      { duration: '5m', target: 10 },
      { duration: '20m', target: 50 },
      { duration: '5m', target: 0 },
    ],
    thresholds: [
      { metric: 'http_req_failed', condition: 'rate<0.05' },
      { metric: 'http_req_duration', condition: 'p(95)<500' },
    ],
    requests: [
      {
        id: 'list-orders',
        name: 'List Orders',
        method: 'GET',
        path: '/orders?page=1&limit=20',
        assertions: [{ type: 'status', operator: 'eq', value: 200 }],
      },
      {
        id: 'get-order',
        name: 'Get Order by ID',
        method: 'GET',
        path: '/orders/123',
        assertions: [
          { type: 'status', operator: 'eq', value: 200 },
          { type: 'latency', operator: 'lt', value: 300 },
        ],
      },
    ],
  });

  // Stateful flow
  await FlowModel.create({
    name: 'Order Lifecycle Flow',
    description: 'Login → Create → Get → Update → Cancel order',
    serviceId: ordersService._id,
    environment: 'qa',
    authConfigId: bearerAuth._id,
    vus: 10,
    duration: '10m',
    steps: [
      {
        id: 'create-order',
        name: 'Create Order',
        method: 'POST',
        path: '/orders',
        body: JSON.stringify({ product: 'widget', quantity: 1 }),
        extractVars: [{ name: 'orderId', jsonPath: 'data.id' }],
        assertions: [{ type: 'status', operator: 'eq', value: 201 }],
      },
      {
        id: 'get-order',
        name: 'Get Order',
        method: 'GET',
        path: '/orders/{{orderId}}',
        assertions: [{ type: 'status', operator: 'eq', value: 200 }],
      },
      {
        id: 'update-order',
        name: 'Update Order',
        method: 'PATCH',
        path: '/orders/{{orderId}}',
        body: JSON.stringify({ quantity: 2 }),
        assertions: [{ type: 'status', operator: 'eq', value: 200 }],
      },
      {
        id: 'cancel-order',
        name: 'Cancel Order',
        method: 'DELETE',
        path: '/orders/{{orderId}}',
        assertions: [{ type: 'status', operator: 'eq', value: 204 }],
      },
    ],
  });

  console.log('✅ Seed complete');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
