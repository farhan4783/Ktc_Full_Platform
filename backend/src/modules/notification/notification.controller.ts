import { Request, Response, NextFunction } from 'express';
import * as notificationService from './notification.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../config/database';

export async function createNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const creatorId = req.user?.userId;
    const role = req.user?.role;
    if (!creatorId || !role) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { targetScope, targetId } = req.body;

    // 1. Role-based scoping checks
    if (role === 'STUDENT') {
      throw new AppError('Access denied: Students cannot send notifications', 403, 'FORBIDDEN');
    }

    if (role === 'COLLEGE_ADMIN') {
      if (targetScope === 'ALL') {
        throw new AppError('Access denied: College admins cannot broadcast globally', 403, 'FORBIDDEN');
      }
      if (targetScope === 'COLLEGE' && targetId !== req.user?.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
      if (targetScope === 'BATCH') {
        const batch = await prisma.batch.findUnique({
          where: { id: targetId },
        });
        if (!batch || batch.collegeId !== req.user?.collegeId) {
          throw new AppError('Access denied: Scoped college batches only', 403, 'FORBIDDEN');
        }
      }
      if (targetScope === 'INDIVIDUAL') {
        const student = await prisma.student.findFirst({
          where: { userId: targetId },
        });
        if (student && student.collegeId !== req.user?.collegeId) {
          throw new AppError('Access denied: Scoped college students only', 403, 'FORBIDDEN');
        }
      }
    }

    if (role === 'TRAINER') {
      if (targetScope === 'ALL' || targetScope === 'COLLEGE') {
        throw new AppError('Access denied: Trainers can only send to batches or individuals', 403, 'FORBIDDEN');
      }
      if (targetScope === 'BATCH') {
        // Verify trainer is assigned to batch
        const trainer = await prisma.trainer.findUnique({
          where: { userId: creatorId },
        });
        const assigned = await prisma.batchTrainer.findFirst({
          where: { batchId: targetId, trainerId: trainer?.id },
        });
        if (!assigned) {
          throw new AppError('Access denied: Trainers can only notify their assigned batches', 403, 'FORBIDDEN');
        }
      }
    }

    const notification = await notificationService.createNotification(req.body, creatorId);
    sendSuccess(res, notification, 201);
  } catch (error) {
    next(error);
  }
}

export async function getMyNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await notificationService.getUserNotifications(userId, page, limit);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const result = await notificationService.markAsRead(id, userId);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    await notificationService.markAllAsRead(userId);
    sendSuccess(res, { message: 'All notifications marked as read' }, 200);
  } catch (error) {
    next(error);
  }
}
