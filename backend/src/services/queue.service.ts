import { Queue, Worker, Job } from 'bullmq';
import getRedisClient from '../config/redis';
import { logger } from '../utils/logger';
import { sendVerificationOtp, sendPasswordResetOtp, sendWelcomeEmail } from './email.service';
import * as notificationService from '../modules/notification/notification.service';

// Job names
export const JOBS = {
  SEND_VERIFICATION_EMAIL: 'SEND_VERIFICATION_EMAIL',
  SEND_RESET_EMAIL: 'SEND_RESET_EMAIL',
  SEND_WELCOME_EMAIL: 'SEND_WELCOME_EMAIL',
  DISPATCH_NOTIFICATION: 'DISPATCH_NOTIFICATION',
};

// Handlers definition
const handlers: Record<string, (data: any) => Promise<any>> = {
  [JOBS.SEND_VERIFICATION_EMAIL]: async (data) => {
    return sendVerificationOtp(data.email, data.otp, data.firstName);
  },
  [JOBS.SEND_RESET_EMAIL]: async (data) => {
    return sendPasswordResetOtp(data.email, data.otp, data.firstName);
  },
  [JOBS.SEND_WELCOME_EMAIL]: async (data) => {
    return sendWelcomeEmail(data.email, data.firstName, data.tempPassword, data.role);
  },
  [JOBS.DISPATCH_NOTIFICATION]: async (data) => {
    return notificationService.createNotification(data.data, data.creatorId);
  },
};

let queue: Queue | null = null;
let worker: Worker | null = null;
let isRedisOnline = false;

export async function initQueue() {
  const redis = getRedisClient();

  try {
    // Check if Redis is online using ping
    await redis.ping();
    isRedisOnline = true;
    logger.info('Redis is online. Initializing BullMQ queues...');

    queue = new Queue('default-queue', {
      connection: redis as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    worker = new Worker(
      'default-queue',
      async (job: Job) => {
        logger.info(`[Worker] Processing job ${job.name} (ID: ${job.id})`);
        const handler = handlers[job.name];
        if (handler) {
          await handler(job.data);
        } else {
          logger.warn(`No handler registered for job: ${job.name}`);
        }
      },
      {
        connection: redis as any,
      }
    );

    worker.on('completed', (job) => {
      logger.info(`[Worker] Job ${job.name} completed successfully`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`[Worker] Job ${job?.name} failed: ${err.message}`);
    });

  } catch (error: any) {
    isRedisOnline = false;
    logger.warn(`Redis is offline or unreachable (${error.message}). BullMQ will run in synchronous fallback mode.`);
  }
}

/**
 * Add a job to the queue. If Redis is down, executes the job synchronously.
 */
export async function addJob(jobName: string, data: any) {
  if (isRedisOnline && queue) {
    try {
      logger.info(`Enqueuing background job: ${jobName}`);
      await queue.add(jobName, data);
      return { status: 'enqueued', jobName };
    } catch (error: any) {
      logger.warn(`Failed to enqueue job to Redis (${error.message}). Falling back to synchronous execution.`);
    }
  }

  // Fallback: Run synchronously
  logger.info(`[Synchronous Fallback] Executing job synchronously: ${jobName}`);
  const handler = handlers[jobName];
  if (handler) {
    try {
      await handler(data);
      return { status: 'completed_sync', jobName };
    } catch (error: any) {
      logger.error(`Synchronous execution of job ${jobName} failed:`, error);
      throw error;
    }
  } else {
    logger.warn(`No handler found for job: ${jobName}`);
    return { status: 'no_handler', jobName };
  }
}
