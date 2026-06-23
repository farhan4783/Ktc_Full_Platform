import { Request, Response, NextFunction } from 'express';
import * as courseService from './course.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

// =================== COURSE HANDLERS ===================

export async function createCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const creatorId = req.user?.userId;
    if (!creatorId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const course = await courseService.createCourse(req.body, creatorId);
    sendSuccess(res, course, 201);
  } catch (error) {
    next(error);
  }
}

export async function getCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search ? String(req.query.search) : undefined;
    const role = req.user?.role;

    const result = await courseService.getCourses(page, limit, search, role);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const role = req.user?.role;

    const course = await courseService.getCourseById(id, role);
    sendSuccess(res, course, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const course = await courseService.updateCourse(id, req.body);
    sendSuccess(res, course, 200);
  } catch (error) {
    next(error);
  }
}

export async function publishCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const course = await courseService.publishCourse(id, status);
    sendSuccess(res, course, 200);
  } catch (error) {
    next(error);
  }
}

export async function deleteCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const course = await courseService.deleteCourse(id);
    sendSuccess(res, course, 200);
  } catch (error) {
    next(error);
  }
}

// =================== MODULE HANDLERS ===================

export async function createModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { courseId } = req.params;
    const moduleRecord = await courseService.createModule(courseId, req.body);
    sendSuccess(res, moduleRecord, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { moduleId } = req.params;
    const moduleRecord = await courseService.updateModule(moduleId, req.body);
    sendSuccess(res, moduleRecord, 200);
  } catch (error) {
    next(error);
  }
}

export async function deleteModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { moduleId } = req.params;
    const result = await courseService.deleteModule(moduleId);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

// =================== LESSON HANDLERS ===================

export async function createLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { moduleId } = req.params;
    const lesson = await courseService.createLesson(moduleId, req.body);
    sendSuccess(res, lesson, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lessonId } = req.params;
    const lesson = await courseService.updateLesson(lessonId, req.body);
    sendSuccess(res, lesson, 200);
  } catch (error) {
    next(error);
  }
}

export async function deleteLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lessonId } = req.params;
    const result = await courseService.deleteLesson(lessonId);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}
