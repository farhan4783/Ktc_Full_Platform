import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import { createApp, applyErrorHandler } from './config/app';
import { logger } from './utils/logger';
import prisma from './config/database';
import { getRedisClient, closeRedis } from './config/redis';
import { initQueue } from './services/queue.service';

// Routers
import authRouter from './modules/auth/auth.router';
import userRouter from './modules/user/user.router';
import collegeRouter from './modules/college/college.router';
import studentRouter from './modules/student/student.router';
import trainerRouter from './modules/trainer/trainer.router';
import courseRouter from './modules/course/course.router';
import batchRouter from './modules/batch/batch.router';
import attendanceRouter from './modules/attendance/attendance.router';
import quizRouter from './modules/quiz/quiz.router';
import assignmentRouter from './modules/assignment/assignment.router';
import certificateRouter from './modules/certificate/certificate.router';
import jobRouter from './modules/job/job.router';
import placementRouter from './modules/placement/placement.router';
import notificationRouter from './modules/notification/notification.router';
import uploadRouter from './modules/upload/upload.router';
import recruiterRouter from './modules/recruiter/recruiter.router';

const app = createApp();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Register routes
app.use(`/api/${API_VERSION}/auth`, authRouter);
app.use(`/api/${API_VERSION}/users`, userRouter);
app.use(`/api/${API_VERSION}/colleges`, collegeRouter);
app.use(`/api/${API_VERSION}/students`, studentRouter);
app.use(`/api/${API_VERSION}/trainers`, trainerRouter);
app.use(`/api/${API_VERSION}/courses`, courseRouter);
app.use(`/api/${API_VERSION}/batches`, batchRouter);
app.use(`/api/${API_VERSION}/attendance`, attendanceRouter);
app.use(`/api/${API_VERSION}/quizzes`, quizRouter);
app.use(`/api/${API_VERSION}/assignments`, assignmentRouter);
app.use(`/api/${API_VERSION}/certificates`, certificateRouter);
app.use(`/api/${API_VERSION}/jobs`, jobRouter);
app.use(`/api/${API_VERSION}/placements`, placementRouter);
app.use(`/api/${API_VERSION}/notifications`, notificationRouter);
app.use(`/api/${API_VERSION}/uploads`, uploadRouter);
app.use(`/api/${API_VERSION}/recruiters`, recruiterRouter);

// Apply error handling middleware (must be after routes)
applyErrorHandler(app);

// Start server function
async function startServer() {
  try {
    // 1. Verify Database connection
    logger.info('Connecting to database...');
    await prisma.$connect();
    logger.info('Database connected successfully');

    // 2. Try connecting to Redis (optional/lazy connection)
    if (process.env.REDIS_URL || process.env.NODE_ENV !== 'test') {
      logger.info('Connecting to Redis...');
      const redis = getRedisClient();
      await redis.connect().catch((err) => {
        logger.warn(`Redis connection failed to initialize synchronously: ${err.message}. App will fall back to lazy connect.`);
      });
    }

    // 3. Initialize background queues
    logger.info('Initializing background queues...');
    await initQueue();

    // 4. Start listening
    const server = app.listen(PORT, () => {
      logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed.');
        
        try {
          await prisma.$disconnect();
          logger.info('Prisma disconnected.');
          
          await closeRedis();
          logger.info('Redis connection closed.');
          
          logger.info('Graceful shutdown completed successfully.');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close if it takes too long
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
