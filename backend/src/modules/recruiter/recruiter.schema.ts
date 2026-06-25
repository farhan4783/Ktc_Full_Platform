import { z } from 'zod';

export const registerRecruiterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().min(1),
  designation: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
});

export const updateRecruiterProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  designation: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
});

export const updateJobInterestStatusSchema = z.object({
  status: z.enum(['INTERESTED', 'APPLIED', 'SHORTLISTED', 'REJECTED', 'HIRED']),
});
