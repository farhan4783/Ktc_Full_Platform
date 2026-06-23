import { z } from 'zod';

export const generateCertificateSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  courseId: z.string().uuid('Invalid course ID'),
  batchId: z.string().uuid('Invalid batch ID'),
});

export type GenerateCertificateInput = z.infer<typeof generateCertificateSchema>;
