import { Request, Response, NextFunction } from 'express';
import * as userService from './user.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const profile = await userService.getUserProfile(userId);
    sendSuccess(res, profile, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const updated = await userService.updateUserProfile(userId, req.body);
    sendSuccess(res, updated, 200);
  } catch (error) {
    next(error);
  }
}

export async function registerFcm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const result = await userService.registerFcmToken(userId, req.body.fcmToken);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}
