import { z } from 'zod';
import { PlacementStatus } from '@prisma/client';

export const updateStudentProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format').optional().nullable(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
  enrollmentNumber: z.string().max(50).optional().nullable(),
  branch: z.string().max(100).optional().nullable(),
  graduationYear: z.number().int().min(2000).max(2100).optional().nullable(),
  cgpa: z.number().min(0).max(10).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  dateOfBirth: z.string().datetime().optional().nullable().transform((val) => val ? new Date(val) : val),
  resumeUrl: z.string().url('Invalid resume URL').optional().nullable(),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().nullable(),
  githubUrl: z.string().url('Invalid GitHub URL').optional().nullable(),
  skills: z.array(z.string().min(1)).optional(),
  placementStatus: z.nativeEnum(PlacementStatus).optional(),
});

export const importStudentsSchema = z.object({
  collegeId: z.string().uuid('Invalid college ID'),
  csvData: z.string().min(1, 'CSV data string is required'), // Base64 or raw string
});

export const evaluateMockInterviewSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
});

export type UpdateStudentProfileInput = z.infer<typeof updateStudentProfileSchema>;
export type ImportStudentsInput = z.infer<typeof importStudentsSchema>;
export type EvaluateMockInterviewInput = z.infer<typeof evaluateMockInterviewSchema>;
