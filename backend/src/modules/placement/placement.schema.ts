import { z } from 'zod';

export const createPlacementSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  companyName: z.string().min(1, 'Company name is required'),
  roleTitle: z.string().min(1, 'Role title is required'),
  offerType: z.enum(['FULL_TIME', 'INTERNSHIP', 'CONTRACT', 'FREELANCE']),
  ctcAnnual: z.number().nonnegative().optional().nullable(),
  stipendMonthly: z.number().nonnegative().optional().nullable(),
  offerDate: z.string().datetime().optional().nullable().transform((val) => val ? new Date(val) : null),
  joiningDate: z.string().datetime().optional().nullable().transform((val) => val ? new Date(val) : null),
  location: z.string().optional().nullable(),
  documentId: z.string().uuid('Invalid document ID').optional().nullable(),
  source: z.enum(['COLLEGE_DRIVE', 'JOB_BOARD', 'REFERRAL', 'SELF', 'OTHER']).default('COLLEGE_DRIVE'),
  notes: z.string().optional().nullable(),
});

export const updatePlacementSchema = createPlacementSchema.partial();

export const verifyPlacementSchema = z.object({
  isVerified: z.boolean(),
  notes: z.string().optional().nullable(),
});

export const createDocumentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  documentType: z.enum(['OFFER_LETTER', 'INTERNSHIP_LETTER', 'COMPLETION_LETTER', 'RECOMMENDATION_LETTER', 'OTHER']),
  title: z.string().min(1, 'Title is required'),
  fileUrl: z.string().url('Invalid file URL'),
  companyName: z.string().optional().nullable(),
  issueDate: z.string().datetime().optional().nullable().transform((val) => val ? new Date(val) : null),
  notes: z.string().optional().nullable(),
});

export type CreatePlacementInput = z.infer<typeof createPlacementSchema>;
export type UpdatePlacementInput = z.infer<typeof updatePlacementSchema>;
export type VerifyPlacementInput = z.infer<typeof verifyPlacementSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
