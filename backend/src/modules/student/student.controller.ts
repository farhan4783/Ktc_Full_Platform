import { Request, Response, NextFunction } from 'express';
import * as studentService from './student.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

export async function getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    
    const filters = {
      search: req.query.search ? String(req.query.search) : undefined,
      collegeId: req.query.collegeId ? String(req.query.collegeId) : undefined,
      batchId: req.query.batchId ? String(req.query.batchId) : undefined,
      placementStatus: req.query.placementStatus ? String(req.query.placementStatus) : undefined,
      graduationYear: req.query.graduationYear ? Number(req.query.graduationYear) : undefined,
    };

    // Scoped college access for College Admins
    if (req.user?.role === 'COLLEGE_ADMIN') {
      filters.collegeId = req.user.collegeId;
    }

    const result = await studentService.getStudents(page, limit, filters);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const student = await studentService.getStudentById(id);

    // Enforce multi-tenancy: College Admin can only view their own college's students
    if (req.user?.role === 'COLLEGE_ADMIN' && student.collegeId !== req.user.collegeId) {
      throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
    }

    // Students can only view their own profile
    if (req.user?.role === 'STUDENT' && student.userId !== req.user.userId) {
      throw new AppError('Access denied: You can only view your own profile', 403, 'FORBIDDEN');
    }

    sendSuccess(res, student, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const student = await studentService.getStudentById(id);

    // Scoped access check: Students can only update their own profile
    if (req.user?.role === 'STUDENT' && student.userId !== req.user.userId) {
      throw new AppError('Access denied: You can only update your own profile', 403, 'FORBIDDEN');
    }

    // Scoped access check: College Admin can only update their own college students
    if (req.user?.role === 'COLLEGE_ADMIN' && student.collegeId !== req.user.collegeId) {
      throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
    }

    const updated = await studentService.updateStudent(id, req.body);
    sendSuccess(res, updated, 200);
  } catch (error) {
    next(error);
  }
}

export async function importStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { collegeId, csvData } = req.body;

    // Scoped access check: College Admin can only import to their own college
    if (req.user?.role === 'COLLEGE_ADMIN' && collegeId !== req.user.collegeId) {
      throw new AppError('Access denied: Can only import to your own college', 403, 'FORBIDDEN');
    }

    const result = await studentService.bulkImportStudents(collegeId, csvData);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function saveLessonProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params; // student ID
    const { lessonId, videoProgressSecs, isCompleted } = req.body;

    const student = await studentService.getStudentById(id);
    if (req.user?.role === 'STUDENT' && student.userId !== req.user.userId) {
      throw new AppError('Access denied: Scoped student access only', 403, 'FORBIDDEN');
    }

    const progress = await studentService.saveProgress(id, lessonId, videoProgressSecs, isCompleted);
    sendSuccess(res, progress, 200);
  } catch (error) {
    next(error);
  }
}
