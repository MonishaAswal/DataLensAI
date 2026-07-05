import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import datasetRoutes from './routes/datasetRoutes.js';
import imputationRoutes from './routes/imputation.js';
import historyRoutes from './routes/historyRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Config directory resolution for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS for frontend requests
app.use(cors({
  origin: '*', // For local dev, allow all. Customize in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'express-backend' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dataset', datasetRoutes);
app.use('/api/imputation', imputationRoutes);
app.use('/api/history', historyRoutes);

// Static uploads folder access (if needed for temporary verification)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack || err.message);
  
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || 'An internal server error occurred',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

let PORT = process.env.PORT || 5000;
if (isNaN(Number(PORT))) {
  console.warn(`[Warning] Provided PORT "${PORT}" is not a valid number. Falling back to default port 5000.`);
  PORT = 5000;
}

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
