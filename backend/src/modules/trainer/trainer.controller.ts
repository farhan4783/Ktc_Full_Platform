import { Request, Response, NextFunction } from 'express';
import * as trainerService from './trainer.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

export async function getTrainers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await trainerService.getTrainers(page, limit, search);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getTrainer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const trainer = await trainerService.getTrainerById(id);
    sendSuccess(res, trainer, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateTrainer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const trainer = await trainerService.getTrainerById(id);

    // Scoped access check: Trainers can only update their own profile
    if (req.user?.role === 'TRAINER' && trainer.userId !== req.user.userId) {
      throw new AppError('Access denied: You can only update your own profile', 403, 'FORBIDDEN');
    }

    const updated = await trainerService.updateTrainer(id, req.body);
    sendSuccess(res, updated, 200);
  } catch (error) {
    next(error);
  }
}
