import { z } from 'zod';

export const createNotificationSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  data: z.record(z.any()).default({}),
  targetScope: z.enum(['ALL', 'COLLEGE', 'BATCH', 'INDIVIDUAL']),
  targetId: z.string().optional().nullable(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
