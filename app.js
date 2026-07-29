import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { seedDatabase } from './seed.js';

import authRoutes from './routes/authRoutes.js';
import promptRoutes from './routes/promptRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

dotenv.config();

const app = express();

// Configure CORS for decoupled frontend and backend support
const allowedOrigins = process.env.CLIENT_URL 
  ? [process.env.CLIENT_URL, 'http://localhost:3000', 'http://localhost:5173']
  : '*';

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure DB connection for every request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Connect DB and seed
connectDB().then(() => {
  seedDatabase();
}).catch((err) => {
  console.error('Failed to initialize MongoDB:', err);
});

export default app;
