import mongoose from 'mongoose';
import { config } from '../config/index.js';

export async function connectDatabase() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log(`✅ MongoDB connected: ${config.MONGODB_URI}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    throw err;
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
