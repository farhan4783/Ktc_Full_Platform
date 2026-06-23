import { z } from 'zod';
import { CourseDifficulty, CourseStatus, LessonType } from '@prisma/client';

// =================== COURSE SCHEMAS ===================
export const createCourseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100),
  description: z.string().max(2000).optional().nullable(),
  shortDescription: z.string().max(255).optional().nullable(),
  thumbnailUrl: z.string().url('Invalid thumbnail URL').optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  difficulty: z.nativeEnum(CourseDifficulty).default(CourseDifficulty.BEGINNER),
  durationHours: z.number().int().min(1).optional().nullable(),
  isSequential: z.boolean().default(true),
  minAttendancePct: z.number().int().min(0).max(100).default(75),
  minQuizAvgPct: z.number().int().min(0).max(100).default(60),
});

export const updateCourseSchema = createCourseSchema.partial();

export const publishCourseSchema = z.object({
  status: z.nativeEnum(CourseStatus),
});

// =================== MODULE SCHEMAS ===================
export const createModuleSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(1000).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isLocked: z.boolean().default(false),
});

export const updateModuleSchema = createModuleSchema.partial();

// =================== LESSON SCHEMAS ===================
export const createLessonSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(1000).optional().nullable(),
  sortOrder: z.number().int().default(0),
  lessonType: z.nativeEnum(LessonType),
  contentText: z.string().max(10000).optional().nullable(),
  externalUrl: z.string().url('Invalid external URL').optional().nullable(),
  durationMinutes: z.number().int().min(1).optional().nullable(),
  isPreview: z.boolean().default(false),
  isMandatory: z.boolean().default(true),
});

export const updateLessonSchema = createLessonSchema.partial();

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type PublishCourseInput = z.infer<typeof publishCourseSchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
