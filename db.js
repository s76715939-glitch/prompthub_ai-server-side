import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let rawUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prompthub';
// Replace w=w-majority or w=majority with w=1 to avoid write concern errors in standalone or replica set configurations
const MONGODB_URI = rawUri
  .replace('w=w-majority', 'w=1')
  .replace('w=majority', 'w=1');

let isConnected = false;

export async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const opts = {
      bufferCommands: true,
      dbName: process.env.DB_NAME || 'prompthub',
      w: 1,
      writeConcern: {
        w: 1
      }
    };
    
    await mongoose.connect(MONGODB_URI, opts);
    isConnected = true;
    console.log('✅ Connected to MongoDB database:', mongoose.connection.name);
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    throw error;
  }
}
