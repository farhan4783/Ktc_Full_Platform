import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().nullable(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
});

export const registerFcmTokenSchema = z.object({
  fcmToken: z.string().min(1, 'FCM token is required'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RegisterFcmTokenInput = z.infer<typeof registerFcmTokenSchema>;
