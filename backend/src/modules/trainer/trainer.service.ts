import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { UpdateTrainerProfileInput } from './trainer.schema';
import { getPaginationOffset } from '../../utils/pagination';

export async function getTrainers(page: number, limit: number, search?: string) {
  const { skip, take } = getPaginationOffset(page, limit);

  const where: any = {
    isActive: true,
    user: {
      deletedAt: null,
    },
    ...(search && {
      OR: [
        { bio: { contains: search, mode: 'insensitive' } },
        { specialisations: { hasSome: [search] } },
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ],
    }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.trainer.count({ where }),
    prisma.trainer.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
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

export async function getTrainerById(id: string) {
  const trainer = await prisma.trainer.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
      batchTrainers: {
        include: {
          batch: {
            select: {
              id: true,
              name: true,
              code: true,
              startDate: true,
              endDate: true,
              status: true,
              course: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!trainer) {
    throw new AppError('Trainer profile not found', 404, 'TRAINER_NOT_FOUND');
  }

  return trainer;
}

export async function updateTrainer(id: string, data: UpdateTrainerProfileInput) {
  const trainer = await prisma.trainer.findUnique({
    where: { id },
  });

  if (!trainer) {
    throw new AppError('Trainer profile not found', 404, 'TRAINER_NOT_FOUND');
  }

  // Update in a transaction
  return prisma.$transaction(async (tx) => {
    // 1. Update user fields
    const userUpdates: any = {};
    if (data.firstName) userUpdates.firstName = data.firstName;
    if (data.lastName) userUpdates.lastName = data.lastName;
    if (data.phone !== undefined) userUpdates.phone = data.phone;
    if (data.avatarUrl !== undefined) userUpdates.avatarUrl = data.avatarUrl;

    if (Object.keys(userUpdates).length > 0) {
      await tx.user.update({
        where: { id: trainer.userId },
        data: userUpdates,
      });
    }

    // 2. Update trainer profile
    const trainerUpdates: any = {};
    if (data.bio !== undefined) trainerUpdates.bio = data.bio;
    if (data.specialisations !== undefined) trainerUpdates.specialisations = data.specialisations;
    if (data.experienceYears !== undefined) trainerUpdates.experienceYears = data.experienceYears;
    if (data.linkedinUrl !== undefined) trainerUpdates.linkedinUrl = data.linkedinUrl;
    if (data.githubUrl !== undefined) trainerUpdates.githubUrl = data.githubUrl;

    return tx.trainer.update({
      where: { id },
      data: trainerUpdates,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });
  });
}
