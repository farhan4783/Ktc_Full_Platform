import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler } from '../middleware/errorHandler';

export function createApp() {
  const app = express();

  // Security
  app.use(helmet());

  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || 
            /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || 
            corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookies
  app.use(cookieParser());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || 'v1',
      },
    });
  });

  return app;
}

export function applyErrorHandler(app: express.Application) {
  // Global error handler — must be applied AFTER all routes
  app.use(errorHandler);
}
