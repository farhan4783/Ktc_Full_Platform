import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateCollegeInput, UpdateCollegeInput } from './college.schema';
import { getPaginationOffset } from '../../utils/pagination';

export async function createCollege(data: any, creatorId: string) {
  // Check if code is already registered
  const existing = await prisma.college.findUnique({
    where: { code: data.code },
  });
  if (existing) {
    throw new AppError('College code is already registered', 409, 'COLLEGE_CODE_EXISTS');
  }

  return prisma.college.create({
    data: {
      ...data,
      createdBy: creatorId,
      onboardedAt: new Date(),
    },
  });
}

export async function getColleges(page: number, limit: number, search?: string) {
  const { skip, take } = getPaginationOffset(page, limit);
  
  const where: any = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.college.count({ where }),
    prisma.college.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        state: true,
        isActive: true,
        logoUrl: true,
        createdAt: true,
        _count: {
          select: {
            students: true,
            batches: true,
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

export async function getCollegeById(id: string) {
  const college = await prisma.college.findFirst({
    where: { id, deletedAt: null },
    include: {
      _count: {
        select: {
          students: true,
          batches: true,
        },
      },
    },
  });

  if (!college) {
    throw new AppError('College not found', 404, 'COLLEGE_NOT_FOUND');
  }

  return college;
}

export async function updateCollege(id: string, data: any) {
  // Check if college exists
  await getCollegeById(id);

  // If code is updated, check uniqueness
  if (data.code) {
    const existing = await prisma.college.findFirst({
      where: { code: data.code, NOT: { id } },
    });
    if (existing) {
      throw new AppError('College code is already registered', 409, 'COLLEGE_CODE_EXISTS');
    }
  }

  return prisma.college.update({
    where: { id },
    data,
  });
}

export async function deleteCollege(id: string) {
  await getCollegeById(id);

  // Soft delete
  return prisma.college.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });
}

export async function getCollegeAnalytics(id: string) {
  const college = await getCollegeById(id);

  // Get total students
  const totalStudents = await prisma.student.count({
    where: { collegeId: id },
  });

  // Get total batches
  const totalBatches = await prisma.batch.count({
    where: { collegeId: id },
  });

  // Get placed students
  const placedStudents = await prisma.student.count({
    where: { collegeId: id, placementStatus: 'PLACED' },
  });

  // Get actively applying students
  const activeApplicants = await prisma.student.count({
    where: { collegeId: id, placementStatus: 'ACTIVELY_APPLYING' },
  });

  const placementRate = totalStudents > 0 ? (placedStudents / totalStudents) * 100 : 0;

  return {
    collegeId: college.id,
    collegeName: college.name,
    stats: {
      totalStudents,
      totalBatches,
      placedStudents,
      activeApplicants,
      placementRate: parseFloat(placementRate.toFixed(2)),
    },
  };
}
