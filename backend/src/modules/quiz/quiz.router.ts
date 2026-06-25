import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { createQuizSchema, addQuestionSchema, submitQuizSchema } from './quiz.schema';
import * as quizController from './quiz.controller';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// Require login for all routes
router.use(authenticate);

router.post(
  '/',
  requireRole('SUPER_ADMIN', 'TRAINER'),
  auditLog('Quiz'),
  validateBody(createQuizSchema),
  quizController.createQuiz
);

router.post(
  '/:id/questions',
  requireRole('SUPER_ADMIN', 'TRAINER'),
  auditLog('QuizQuestion'),
  validateBody(addQuestionSchema),
  quizController.addQuestion
);

router.post(
  '/:id/attempts',
  requireRole('STUDENT'),
  auditLog('QuizAttempt'),
  quizController.startAttempt
);

router.post(
  '/attempts/:attemptId/submit',
  requireRole('STUDENT'),
  auditLog('QuizAttempt'),
  validateBody(submitQuizSchema),
  quizController.submitAttempt
);

router.get(
  '/',
  quizController.getQuizzes
);

router.get(
  '/:id',
  quizController.getQuiz
);

router.get(
  '/:id/leaderboard',
  requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER', 'STUDENT'),
  quizController.getLeaderboard
);

export default router;
