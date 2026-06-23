import { z } from 'zod';

export const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  companyName: z.string().min(1, 'Company name is required'),
  companyLogoUrl: z.string().url('Invalid URL').optional().nullable(),
  jobType: z.enum(['FULL_TIME', 'INTERNSHIP', 'CONTRACT']),
  description: z.string().optional().nullable(),
  skillsRequired: z.array(z.string()).default([]),
  ctcMin: z.number().nonnegative().optional().nullable(),
  ctcMax: z.number().nonnegative().optional().nullable(),
  stipendMonthly: z.number().nonnegative().optional().nullable(),
  location: z.string().optional().nullable(),
  isRemote: z.boolean().default(false),
  applicationLink: z.string().url('Invalid URL').optional().nullable(),
  applicationEmail: z.string().email('Invalid email').optional().nullable(),
  applyDeadline: z.string().datetime().optional().nullable().transform((val) => val ? new Date(val) : null),
  targetBatches: z.array(z.string()).default([]),
  targetColleges: z.array(z.string()).default([]),
});

export const updateJobSchema = createJobSchema.partial();

export const trackInterestSchema = z.object({
  status: z.enum(['INTERESTED', 'APPLIED', 'SHORTLISTED', 'REJECTED', 'HIRED']),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type TrackInterestInput = z.infer<typeof trackInterestSchema>;
