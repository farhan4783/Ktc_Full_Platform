import { z } from 'zod';
import { BatchMode, BatchStatus } from '@prisma/client';

export const createBatchSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  collegeId: z.string().uuid('Invalid college ID'),
  courseId: z.string().uuid('Invalid course ID'),
  startDate: z.string().datetime().transform((val) => new Date(val)),
  endDate: z.string().datetime().transform((val) => new Date(val)),
  mode: z.nativeEnum(BatchMode).default(BatchMode.HYBRID),
  scheduleDays: z.array(z.string()).default([]),
  scheduleTime: z.string().max(100).optional().nullable(),
  capacity: z.number().int().min(1).default(200),
  status: z.nativeEnum(BatchStatus).default(BatchStatus.UPCOMING),
  meetLink: z.string().url('Invalid meet link URL').optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  primaryTrainerId: z.string().uuid('Invalid trainer ID').optional(),
});

export const updateBatchSchema = createBatchSchema.partial();

export const enrollStudentsSchema = z.object({
  studentIds: z.array(z.string().uuid('Invalid student ID')).min(1, 'At least one student ID is required'),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type EnrollStudentsInput = z.infer<typeof enrollStudentsSchema>;
