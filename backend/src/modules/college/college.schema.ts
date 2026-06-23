import { z } from 'zod';

export const createCollegeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  code: z.string().min(2, 'Code must be at least 2 characters').max(30).regex(/^[a-zA-Z0-9-]+$/, 'Code can only contain letters, numbers and hyphens'),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits').optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),
  contactEmail: z.string().email('Invalid email format').optional().nullable().transform((val) => val ? val.toLowerCase().trim() : val),
  contactPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid contact phone format').optional().nullable(),
  logoUrl: z.string().url('Invalid logo URL').optional().nullable(),
  websiteUrl: z.string().url('Invalid website URL').optional().nullable(),
  contractStart: z.string().datetime().optional().nullable().transform((val) => val ? new Date(val) : val),
  contractEnd: z.string().datetime().optional().nullable().transform((val) => val ? new Date(val) : val),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateCollegeSchema = createCollegeSchema.partial();

export type CreateCollegeInput = z.infer<typeof createCollegeSchema>;
export type UpdateCollegeInput = z.infer<typeof updateCollegeSchema>;
