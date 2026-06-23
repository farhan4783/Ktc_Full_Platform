import { Request, Response, NextFunction } from 'express';
import * as assignmentService from './assignment.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../config/database';

export async function createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const assignment = await assignmentService.createAssignment(req.body);
    sendSuccess(res, assignment, 201);
  } catch (error) {
    next(error);
  }
}

export async function submitAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      throw new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND');
    }

    const submission = await assignmentService.submitAssignment(id, student.id, req.body);
    sendSuccess(res, submission, 201);
  } catch (error) {
    next(error);
  }
}

export async function gradeSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subId } = req.params;
    const graderId = req.user?.userId;
    if (!graderId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const submission = await assignmentService.gradeSubmission(subId, req.body, graderId);
    sendSuccess(res, submission, 200);
  } catch (error) {
    next(error);
  }
}
