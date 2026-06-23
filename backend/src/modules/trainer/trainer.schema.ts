import { z } from 'zod';

export const updateTrainerProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format').optional().nullable(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  specialisations: z.array(z.string().min(1)).optional(),
  experienceYears: z.number().int().min(0).max(80).optional().nullable(),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().nullable(),
  githubUrl: z.string().url('Invalid GitHub URL').optional().nullable(),
});

export type UpdateTrainerProfileInput = z.infer<typeof updateTrainerProfileSchema>;
