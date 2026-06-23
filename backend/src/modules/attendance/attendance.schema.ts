import { z } from 'zod';
import { SessionMode, AttendanceStatus } from '@prisma/client';

export const createSessionSchema = z.object({
  batchId: z.string().uuid('Invalid batch ID'),
  trainerId: z.string().uuid('Invalid trainer ID').optional().nullable(),
  sessionDate: z.string().datetime().transform((val) => new Date(val)),
  startTime: z.string().min(1, 'Start time is required').max(10), // e.g. "10:00 AM"
  endTime: z.string().min(1, 'End time is required').max(10),
  topicCovered: z.string().max(255).optional().nullable(),
  mode: z.nativeEnum(SessionMode).default(SessionMode.ONLINE),
  recordingUrl: z.string().url('Invalid recording URL').optional().nullable(),
  sessionNotes: z.string().max(1000).optional().nullable(),
});

export const markAttendanceSchema = z.object({
  records: z.array(
    z.object({
      studentId: z.string().uuid('Invalid student ID'),
      status: z.nativeEnum(AttendanceStatus),
      overrideReason: z.string().max(255).optional().nullable(),
    })
  ).min(1, 'At least one student record is required'),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
