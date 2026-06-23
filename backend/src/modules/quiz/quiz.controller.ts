import { Request, Response, NextFunction } from 'express';
import * as quizService from './quiz.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../config/database';

export async function createQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const creatorId = req.user?.userId;
    if (!creatorId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const quiz = await quizService.createQuiz(req.body, creatorId);
    sendSuccess(res, quiz, 201);
  } catch (error) {
    next(error);
  }
}

export async function addQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const question = await quizService.addQuizQuestion(id, req.body);
    sendSuccess(res, question, 201);
  } catch (error) {
    next(error);
  }
}

export async function startAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const ipAddress = req.ip || req.socket.remoteAddress;
    const attempt = await quizService.startQuizAttempt(id, student.id, ipAddress);
    sendSuccess(res, attempt, 201);
  } catch (error) {
    next(error);
  }
}

export async function submitAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      throw new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND');
    }

    const attempt = await quizService.submitQuizAttempt(attemptId, student.id, req.body.answers);
    sendSuccess(res, attempt, 200);
  } catch (error) {
    next(error);
  }
}

export async function getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const leaderboard = await quizService.getQuizLeaderboard(id);
    sendSuccess(res, leaderboard, 200);
  } catch (error) {
    next(error);
  }
}
