import { Request, Response, NextFunction } from 'express';
import * as jobService from './job.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../config/database';

export async function createJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const creatorId = req.user?.userId;
    if (!creatorId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const job = await jobService.createJob(req.body, creatorId);
    sendSuccess(res, job, 201);
  } catch (error) {
    next(error);
  }
}

export async function getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await jobService.getJobs(page, limit, req.user, search);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const job = await jobService.getJobById(id);
    sendSuccess(res, job, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const job = await jobService.updateJob(id, req.body);
    sendSuccess(res, job, 200);
  } catch (error) {
    next(error);
  }
}

export async function deleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await jobService.deleteJob(id);
    sendSuccess(res, { message: 'Job opportunity deleted successfully' }, 200);
  } catch (error) {
    next(error);
  }
}

export async function trackInterest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params; // jobId
    const { status } = req.body;

    const student = await prisma.student.findUnique({
      where: { userId: req.user?.userId },
    });

    if (!student) {
      throw new AppError('Only students can track interest in job opportunities', 403, 'FORBIDDEN');
    }

    const interest = await jobService.trackInterest(id, student.id, status);
    sendSuccess(res, interest, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateInterestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, studentId } = req.params; // jobId, studentId
    const { status } = req.body;

    const interest = await jobService.trackInterest(id, studentId, status);
    sendSuccess(res, interest, 200);
  } catch (error) {
    next(error);
  }
}

export async function getMyInterests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user?.userId },
    });

    if (!student) {
      throw new AppError('Only students can view their job interests', 403, 'FORBIDDEN');
    }

    const interests = await jobService.getStudentInterests(student.id);
    sendSuccess(res, interests, 200);
  } catch (error) {
    next(error);
  }
}
