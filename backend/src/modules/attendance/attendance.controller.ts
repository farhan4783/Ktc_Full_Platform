import { Request, Response, NextFunction } from 'express';
import * as attendanceService from './attendance.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../config/database';

export async function createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await attendanceService.createSession(req.body);
    sendSuccess(res, session, 201);
  } catch (error) {
    next(error);
  }
}

export async function markAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId } = req.params;
    const markerId = req.user?.userId;
    if (!markerId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const session = await attendanceService.markSessionAttendance(sessionId, req.body.records, markerId);
    sendSuccess(res, session, 200);
  } catch (error) {
    next(error);
  }
}

export async function getBatchGrid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { batchId } = req.params;

    // College Admins can only view attendance for their own college
    if (req.user?.role === 'COLLEGE_ADMIN') {
      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (batch && batch.collegeId !== req.user.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
    }

    // Students can only view attendance if enrolled in that batch
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.userId } });
      if (!student) {
        throw new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND');
      }
      const isEnrolled = await prisma.batchStudent.findUnique({
        where: {
          batchId_studentId: {
            batchId,
            studentId: student.id,
          },
        },
      });
      if (!isEnrolled || isEnrolled.status !== 'ACTIVE') {
        throw new AppError('Access denied: You are not enrolled in this batch', 403, 'FORBIDDEN');
      }
    }

    const grid = await attendanceService.getBatchAttendanceGrid(batchId);
    sendSuccess(res, grid, 200);
  } catch (error) {
    next(error);
  }
}
