import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { getPaginationOffset } from '../../utils/pagination';

export async function createNotification(data: any, creatorId: string) {
  const { type, title, body, data: payload, targetScope, targetId } = data;

  // 1. Determine target user IDs
  let recipientUserIds: string[] = [];

  if (targetScope === 'ALL') {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    recipientUserIds = users.map((u) => u.id);
  } else if (targetScope === 'COLLEGE') {
    if (!targetId) {
      throw new AppError('College ID is required for COLLEGE scope', 400, 'BAD_REQUEST');
    }
    // Get students
    const students = await prisma.student.findMany({
      where: { collegeId: targetId },
      select: { userId: true },
    });
    // Get college admins
    const admins = await prisma.collegeAdmin.findMany({
      where: { collegeId: targetId },
      select: { userId: true },
    });

    recipientUserIds = [
      ...students.map((s) => s.userId),
      ...admins.map((a) => a.userId),
    ];
  } else if (targetScope === 'BATCH') {
    if (!targetId) {
      throw new AppError('Batch ID is required for BATCH scope', 400, 'BAD_REQUEST');
    }
    const enrollments = await prisma.batchStudent.findMany({
      where: { batchId: targetId, status: 'ACTIVE' },
      include: {
        student: { select: { userId: true } },
      },
    });
    recipientUserIds = enrollments.map((e) => e.student.userId);
  } else if (targetScope === 'INDIVIDUAL') {
    if (!targetId) {
      throw new AppError('User ID is required for INDIVIDUAL scope', 400, 'BAD_REQUEST');
    }
    recipientUserIds = [targetId];
  }

  // Deduplicate user IDs
  recipientUserIds = Array.from(new Set(recipientUserIds));

  // 2. Create the notification and recipient records
  return prisma.$transaction(async (tx) => {
    const notification = await tx.notification.create({
      data: {
        type,
        title,
        body,
        data: payload || {},
        createdBy: creatorId,
        targetScope,
        targetId,
      },
    });

    if (recipientUserIds.length > 0) {
      // Find FCM tokens for these users from their active refresh tokens
      const activeTokens = await tx.refreshToken.findMany({
        where: {
          userId: { in: recipientUserIds },
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { userId: true, deviceInfo: true },
      });

      const userFcmTokensMap = new Map<string, string[]>();
      for (const token of activeTokens) {
        const info = token.deviceInfo as Record<string, any> | null;
        if (info && info.fcmToken) {
          const list = userFcmTokensMap.get(token.userId) || [];
          list.push(info.fcmToken);
          userFcmTokensMap.set(token.userId, list);
        }
      }

      // Create recipients
      const recipientsData = recipientUserIds.map((userId) => {
        const hasFcm = userFcmTokensMap.has(userId) && (userFcmTokensMap.get(userId)?.length || 0) > 0;
        return {
          notificationId: notification.id,
          userId,
          isRead: false,
          pushSent: hasFcm,
          emailSent: false,
        };
      });

      await tx.notificationRecipient.createMany({
        data: recipientsData,
      });

      // Simulate sending push notifications
      for (const [userId, fcmTokens] of userFcmTokensMap.entries()) {
        for (const fcmToken of fcmTokens) {
          logger.info(`[FCM PUSH] Sending to User: ${userId} | Token: ${fcmToken} | Title: ${title} | Body: ${body}`);
        }
      }
    }

    return notification;
  });
}

export async function getUserNotifications(userId: string, page: number, limit: number) {
  const { skip, take } = getPaginationOffset(page, limit);

  const where = {
    userId,
  };

  const [total, items] = await prisma.$transaction([
    prisma.notificationRecipient.count({ where }),
    prisma.notificationRecipient.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        notification: {
          include: {
            creator: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / take);

  return {
    items,
    meta: {
      page,
      limit: take,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function markAsRead(notificationId: string, userId: string) {
  const recipient = await prisma.notificationRecipient.findUnique({
    where: {
      notificationId_userId: {
        notificationId,
        userId,
      },
    },
  });

  if (!recipient) {
    throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }

  return prisma.notificationRecipient.update({
    where: {
      notificationId_userId: {
        notificationId,
        userId,
      },
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notificationRecipient.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}
