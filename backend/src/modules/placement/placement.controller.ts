import { Request, Response, NextFunction } from 'express';
import * as placementService from './placement.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../config/database';

export async function createPlacementRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const creatorId = req.user?.userId;
    if (!creatorId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { studentId } = req.body;

    // Scoping check
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: creatorId },
      });
      if (!student || student.id !== studentId) {
        throw new AppError('Access denied: Can only create placement records for yourself', 403, 'FORBIDDEN');
      }
    } else if (req.user?.role === 'COLLEGE_ADMIN') {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });
      if (!student || student.collegeId !== req.user.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
    }

    const record = await placementService.createPlacementRecord(req.body, creatorId);
    sendSuccess(res, record, 201);
  } catch (error) {
    next(error);
  }
}

export async function getPlacementRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await placementService.getPlacementRecords(page, limit, req.user, search);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getPlacementRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const record = await placementService.getPlacementRecordById(id);

    // Scoping check
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
      });
      if (!student || student.id !== record.studentId) {
        throw new AppError('Access denied: Scoped student access only', 403, 'FORBIDDEN');
      }
    } else if (req.user?.role === 'COLLEGE_ADMIN') {
      const student = await prisma.student.findUnique({
        where: { id: record.studentId },
      });
      if (!student || student.collegeId !== req.user.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
    }

    sendSuccess(res, record, 200);
  } catch (error) {
    next(error);
  }
}

export async function updatePlacementRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const record = await placementService.getPlacementRecordById(id);

    // Scoping check
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
      });
      if (!student || student.id !== record.studentId) {
        throw new AppError('Access denied: Scoped student access only', 403, 'FORBIDDEN');
      }
      if (record.isVerified) {
        throw new AppError('Access denied: Cannot update verified placement records', 403, 'FORBIDDEN');
      }
    } else if (req.user?.role === 'COLLEGE_ADMIN') {
      const student = await prisma.student.findUnique({
        where: { id: record.studentId },
      });
      if (!student || student.collegeId !== req.user.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
    }

    const updated = await placementService.updatePlacementRecord(id, req.body);
    sendSuccess(res, updated, 200);
  } catch (error) {
    next(error);
  }
}

export async function deletePlacementRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const record = await placementService.getPlacementRecordById(id);

    // Scoping check
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
      });
      if (!student || student.id !== record.studentId) {
        throw new AppError('Access denied: Scoped student access only', 403, 'FORBIDDEN');
      }
      if (record.isVerified) {
        throw new AppError('Access denied: Cannot delete verified placement records', 403, 'FORBIDDEN');
      }
    } else if (req.user?.role === 'COLLEGE_ADMIN') {
      const student = await prisma.student.findUnique({
        where: { id: record.studentId },
      });
      if (!student || student.collegeId !== req.user.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
    }

    await placementService.deletePlacementRecord(id);
    sendSuccess(res, { message: 'Placement record deleted successfully' }, 200);
  } catch (error) {
    next(error);
  }
}

export async function verifyPlacementRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { isVerified, notes } = req.body;
    const verifierId = req.user?.userId;

    if (!verifierId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const record = await placementService.getPlacementRecordById(id);

    // Scoping check for COLLEGE_ADMIN
    if (req.user?.role === 'COLLEGE_ADMIN') {
      const student = await prisma.student.findUnique({
        where: { id: record.studentId },
      });
      if (!student || student.collegeId !== req.user.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
    }

    const updated = await placementService.verifyPlacementRecord(id, verifierId, isVerified, notes);
    sendSuccess(res, updated, 200);
  } catch (error) {
    next(error);
  }
}

// Student Documents controllers
export async function createStudentDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uploaderId = req.user?.userId;
    if (!uploaderId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { studentId } = req.body;

    // Scoping check
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: uploaderId },
      });
      if (!student || student.id !== studentId) {
        throw new AppError('Access denied: Can only upload documents for yourself', 403, 'FORBIDDEN');
      }
    } else if (req.user?.role === 'COLLEGE_ADMIN') {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });
      if (!student || student.collegeId !== req.user.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
    }

    const document = await placementService.createStudentDocument(req.body, uploaderId);
    sendSuccess(res, document, 201);
  } catch (error) {
    next(error);
  }
}

export async function getStudentDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.params;

    // Scoping check
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
      });
      if (!student || student.id !== studentId) {
        throw new AppError('Access denied: Scoped student access only', 403, 'FORBIDDEN');
      }
    } else if (req.user?.role === 'COLLEGE_ADMIN') {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });
      if (!student || student.collegeId !== req.user.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
    }

    const documents = await placementService.getStudentDocuments(studentId);
    sendSuccess(res, documents, 200);
  } catch (error) {
    next(error);
  }
}

export async function deleteStudentDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const document = await prisma.studentDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // Scoping check
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
      });
      if (!student || student.id !== document.studentId) {
        throw new AppError('Access denied: Scoped student access only', 403, 'FORBIDDEN');
      }
    } else if (req.user?.role === 'COLLEGE_ADMIN') {
      const student = await prisma.student.findUnique({
        where: { id: document.studentId },
      });
      if (!student || student.collegeId !== req.user.collegeId) {
        throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
      }
    }

    await placementService.deleteStudentDocument(id);
    sendSuccess(res, { message: 'Document deleted successfully' }, 200);
  } catch (error) {
    next(error);
  }
}
