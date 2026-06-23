import { z } from 'zod';
import { AssignmentStatus, SubmissionType } from '@prisma/client';

export const createAssignmentSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100),
  description: z.string().max(2000).optional().nullable(),
  courseId: z.string().uuid('Invalid course ID').optional().nullable(),
  moduleId: z.string().uuid('Invalid module ID').optional().nullable(),
  batchId: z.string().uuid('Invalid batch ID').optional().nullable(),
  dueDate: z.string().datetime().transform((val) => new Date(val)),
  totalMarks: z.number().int().min(1),
  passMarks: z.number().int().min(1),
  status: z.nativeEnum(AssignmentStatus).default(AssignmentStatus.DRAFT),
});

export const submitAssignmentSchema = z.object({
  submissionType: z.nativeEnum(SubmissionType),
  contentText: z.string().max(5000).optional().nullable(),
  fileUrl: z.string().url('Invalid file URL').optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  fileSizeBytes: z.number().int().optional().nullable(),
});

export const gradeSubmissionSchema = z.object({
  grade: z.string().max(10).optional().nullable(),
  marksAwarded: z.number().min(0),
  feedback: z.string().max(1000).optional().nullable(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
