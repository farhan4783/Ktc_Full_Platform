import { Request, Response, NextFunction } from 'express';
import * as certificateService from './certificate.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../config/database';

export async function checkEligibility(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId, courseId, batchId } = req.query;

    if (!studentId || !courseId || !batchId) {
      throw new AppError('Missing query parameters: studentId, courseId, batchId are required', 400, 'BAD_REQUEST');
    }

    const sId = String(studentId);
    const cId = String(courseId);
    const bId = String(batchId);

    // Access control:
    // Students can only check their own eligibility
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
      });
      if (!student || student.id !== sId) {
        throw new AppError('Access denied: Can only check own eligibility', 403, 'FORBIDDEN');
      }
    } else if (req.user?.role === 'COLLEGE_ADMIN') {
      const student = await prisma.student.findUnique({
        where: { id: sId },
      });
      if (!student || student.collegeId !== req.user.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
    }

    const eligibility = await certificateService.validateEligibility(sId, cId, bId);
    sendSuccess(res, eligibility, 200);
  } catch (error) {
    next(error);
  }
}

export async function generateCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId, courseId, batchId } = req.body;
    const issuerId = req.user?.userId;

    if (!issuerId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Access control:
    // Only SUPER_ADMIN, COLLEGE_ADMIN, or TRAINER can generate certificates
    if (req.user?.role === 'STUDENT') {
      throw new AppError('Access denied: Students cannot generate certificates', 403, 'FORBIDDEN');
    }

    if (req.user?.role === 'COLLEGE_ADMIN') {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });
      if (!student || student.collegeId !== req.user.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
    }

    const certificate = await certificateService.generateCertificate(studentId, courseId, batchId, issuerId);
    sendSuccess(res, certificate, 201);
  } catch (error) {
    next(error);
  }
}

export async function getStudentCertificates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.params;

    // Access control:
    // Students can only view their own certificates
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
      });
      if (!student || student.id !== studentId) {
        throw new AppError('Access denied: Can only view own certificates', 403, 'FORBIDDEN');
      }
    } else if (req.user?.role === 'COLLEGE_ADMIN') {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });
      if (!student || student.collegeId !== req.user.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
    }

    const certificates = await certificateService.getStudentCertificates(studentId);
    sendSuccess(res, certificates, 200);
  } catch (error) {
    next(error);
  }
}

export async function verifyCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.params;
    const certificate = await certificateService.verifyCertificate(code);
    sendSuccess(res, certificate, 200);
  } catch (error) {
    next(error);
  }
}
