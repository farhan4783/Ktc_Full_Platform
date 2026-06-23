import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { UpdateProfileInput } from './user.schema';

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      isEmailVerified: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  return user;
}

export async function updateUserProfile(userId: string, data: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
    },
  });
}

export async function registerFcmToken(userId: string, fcmToken: string) {
  // Find the user's latest active refresh token
  const latestToken = await prisma.refreshToken.findFirst({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (latestToken) {
    const currentInfo = (latestToken.deviceInfo as Record<string, any>) || {};
    await prisma.refreshToken.update({
      where: { id: latestToken.id },
      data: {
        deviceInfo: {
          ...currentInfo,
          fcmToken,
        },
      },
    });
  }
  
  return { success: true, message: 'FCM token registered successfully' };
}
