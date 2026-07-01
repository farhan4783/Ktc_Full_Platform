import { Request, Response, NextFunction } from 'express';
import * as batchService from './batch.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import { getCache, setCache, deleteCache } from '../../config/redis';

export async function createBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const creatorId = req.user?.userId;
    if (!creatorId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const batch = await batchService.createBatch(req.body, creatorId);
    sendSuccess(res, batch, 201);
  } catch (error) {
    next(error);
  }
}

import prisma from '../../config/database';

export async function getBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const filters: any = {
      search: req.query.search ? String(req.query.search) : undefined,
      collegeId: req.query.collegeId ? String(req.query.collegeId) : undefined,
      trainerId: req.query.trainerId ? String(req.query.trainerId) : undefined,
      studentId: req.query.studentId ? String(req.query.studentId) : undefined,
    };

    // Scoped college access policy for College Admins
    if (req.user?.role === 'COLLEGE_ADMIN') {
      filters.collegeId = req.user.collegeId;
    }

    // Trainers can only list their own batches unless they are Super Admin
    if (req.user?.role === 'TRAINER') {
      // Find trainer record first
      const trainer = await prisma.trainer.findUnique({ where: { userId: req.user.userId } });
      if (trainer) {
        filters.trainerId = trainer.id;
      }
    }

    // Students can only see batches they are enrolled in
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.userId } });
      if (student) {
        filters.studentId = student.id;
      }
    }

    const result = await batchService.getBatches(page, limit, filters);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const cacheKey = `batch:${id}`;

    let batch;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      batch = JSON.parse(cachedData);
    } else {
      batch = await batchService.getBatchById(id);
      await setCache(cacheKey, JSON.stringify(batch), 60); // cache for 60 seconds
    }

    // Multi-tenant check: College Admin can only access their own college's batches
    if (req.user?.role === 'COLLEGE_ADMIN' && batch.collegeId !== req.user.collegeId) {
      throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
    }

    // Student can only access their own batch
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.userId } });
      if (!student) {
        throw new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND');
      }
      const isEnrolled = batch.batchStudents.some((bs: any) => bs.studentId === student.id);
      if (!isEnrolled) {
        throw new AppError('Access denied: You are not enrolled in this batch', 403, 'FORBIDDEN');
      }
    }

    sendSuccess(res, batch, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const batch = await batchService.updateBatch(id, req.body);
    await deleteCache(`batch:${id}`); // Invalidate cache
    sendSuccess(res, batch, 200);
  } catch (error) {
    next(error);
  }
}

export async function enrollStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const enrollerId = req.user?.userId;
    if (!enrollerId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const result = await batchService.enrollStudents(id, req.body.studentIds, enrollerId);
    await deleteCache(`batch:${id}`); // Invalidate cache
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function unenrollStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, studentId } = req.params;
    const result = await batchService.unenrollStudent(id, studentId);
    await deleteCache(`batch:${id}`); // Invalidate cache
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}
