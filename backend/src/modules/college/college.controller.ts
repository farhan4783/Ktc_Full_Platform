import { Request, Response, NextFunction } from 'express';
import * as collegeService from './college.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

export async function createCollege(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const creatorId = req.user?.userId;
    if (!creatorId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const college = await collegeService.createCollege(req.body, creatorId);
    sendSuccess(res, college, 201);
  } catch (error) {
    next(error);
  }
}

export async function getColleges(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search ? String(req.query.search) : undefined;
    
    const result = await collegeService.getColleges(page, limit, search);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getCollege(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    
    // College Admins can only view their own college details
    if (req.user?.role === 'COLLEGE_ADMIN' && req.user.collegeId !== id) {
      throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
    }

    const college = await collegeService.getCollegeById(id);
    sendSuccess(res, college, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateCollege(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    
    // College Admins can only update their own college
    if (req.user?.role === 'COLLEGE_ADMIN' && req.user.collegeId !== id) {
      throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
    }

    const college = await collegeService.updateCollege(id, req.body);
    sendSuccess(res, college, 200);
  } catch (error) {
    next(error);
  }
}

export async function deleteCollege(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const college = await collegeService.deleteCollege(id);
    sendSuccess(res, college, 200);
  } catch (error) {
    next(error);
  }
}

export async function getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    // College Admins can only view analytics for their own college
    if (req.user?.role === 'COLLEGE_ADMIN' && req.user.collegeId !== id) {
      throw new AppError('Access denied: Scoped college access only', 403, 'FORBIDDEN');
    }

    const analytics = await collegeService.getCollegeAnalytics(id);
    sendSuccess(res, analytics, 200);
  } catch (error) {
    next(error);
  }
}
