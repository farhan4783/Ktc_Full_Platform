import { z } from 'zod';
import { QuizStatus, QuestionType, QuestionDifficulty } from '@prisma/client';

export const createQuizSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100),
  description: z.string().max(1000).optional().nullable(),
  courseId: z.string().uuid('Invalid course ID').optional().nullable(),
  moduleId: z.string().uuid('Invalid module ID').optional().nullable(),
  batchId: z.string().uuid('Invalid batch ID').optional().nullable(),
  timeLimitMins: z.number().int().min(1).optional().nullable(),
  totalMarks: z.number().int().min(1),
  passMarks: z.number().int().min(1),
  attemptsAllowed: z.number().int().min(1).default(1),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(true),
  showAnswersImmediately: z.boolean().default(true),
  availableFrom: z.string().datetime().optional().nullable().transform((val) => val ? new Date(val) : val),
  availableUntil: z.string().datetime().optional().nullable().transform((val) => val ? new Date(val) : val),
  status: z.nativeEnum(QuizStatus).default(QuizStatus.DRAFT),
});

export const addQuestionSchema = z.object({
  questionText: z.string().min(2, 'Question text is required').max(2000),
  questionType: z.nativeEnum(QuestionType),
  marks: z.number().int().min(1).default(1),
  difficulty: z.nativeEnum(QuestionDifficulty).default(QuestionDifficulty.MEDIUM),
  topicTag: z.string().max(50).optional().nullable(),
  explanation: z.string().max(1000).optional().nullable(),
  sortOrder: z.number().int().default(0),
  options: z.array(
    z.object({
      optionText: z.string().min(1, 'Option text is required').max(1000),
      isCorrect: z.boolean().default(false),
      sortOrder: z.number().int().default(0),
    })
  ).min(2, 'At least 2 options are required for multiple choice questions'),
});

export const submitQuizSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid('Invalid question ID'),
      selectedOptionIds: z.array(z.string().uuid('Invalid option ID')).default([]),
      textAnswer: z.string().max(2000).optional().nullable(),
    })
  ).default([]),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type AddQuestionInput = z.infer<typeof addQuestionSchema>;
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
