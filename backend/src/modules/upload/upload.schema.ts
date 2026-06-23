import { z } from 'zod';

export const getPresignedUrlSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255),
  contentType: z.string().min(1, 'Content type is required').regex(/^[a-zA-Z-]+\/[a-zA-Z0-9.+-]+$/, 'Invalid content type'),
  context: z.enum(['avatars', 'resumes', 'assignments', 'materials', 'logos', 'documents']),
});

export type GetPresignedUrlInput = z.infer<typeof getPresignedUrlSchema>;
