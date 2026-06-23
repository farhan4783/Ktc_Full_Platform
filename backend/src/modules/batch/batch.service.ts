import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getPaginationOffset } from '../../utils/pagination';
import { generateBatchCode } from '../../utils/codeGenerator';

export async function createBatch(data: any, creatorId: string) {
  const { primaryTrainerId, ...batchData } = data;

  // Check college and course existence
  const college = await prisma.college.findUnique({ where: { id: batchData.collegeId } });
  if (!college) {
    throw new AppError('College not found', 404, 'COLLEGE_NOT_FOUND');
  }

  const course = await prisma.course.findUnique({ where: { id: batchData.courseId } });
  if (!course || course.deletedAt) {
    throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
  }

  const code = generateBatchCode(college.code);

  return prisma.$transaction(async (tx) => {
    // 1. Create the Batch
    const batch = await tx.batch.create({
      data: {
        ...batchData,
        code,
        createdBy: creatorId,
      },
    });

    // 2. Link primary trainer if specified
    if (primaryTrainerId) {
      const trainer = await tx.trainer.findUnique({ where: { id: primaryTrainerId } });
      if (!trainer) {
        throw new AppError('Trainer not found', 404, 'TRAINER_NOT_FOUND');
      }

      await tx.batchTrainer.create({
        data: {
          batchId: batch.id,
          trainerId: primaryTrainerId,
          isPrimary: true,
        },
      });
    }

    return batch;
  });
}

export async function getBatches(
  page: number,
  limit: number,
  filters: {
    search?: string;
    collegeId?: string;
    trainerId?: string;
    studentId?: string;
  }
) {
  const { skip, take } = getPaginationOffset(page, limit);

  const where: any = {
    ...(filters.collegeId && { collegeId: filters.collegeId }),
    ...(filters.trainerId && {
      batchTrainers: {
        some: {
          trainerId: filters.trainerId,
        },
      },
    }),
    ...(filters.studentId && {
      batchStudents: {
        some: {
          studentId: filters.studentId,
          status: 'ACTIVE',
        },
      },
    }),
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.batch.count({ where }),
    prisma.batch.findMany({
      where,
      skip,
      take,
      orderBy: { startDate: 'desc' },
      include: {
        college: {
          select: { id: true, name: true },
        },
        course: {
          select: { id: true, title: true },
        },
        batchTrainers: {
          include: {
            trainer: {
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            batchStudents: true,
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

export async function getBatchById(id: string) {
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      college: true,
      course: true,
      batchTrainers: {
        include: {
          trainer: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      },
      batchStudents: {
        where: { status: 'ACTIVE' },
        include: {
          student: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      },
    },
  });

  if (!batch) {
    throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
  }

  return batch;
}

export async function updateBatch(id: string, data: any) {
  const { primaryTrainerId, ...batchData } = data;
  await getBatchById(id);

  return prisma.$transaction(async (tx) => {
    // 1. Update Batch fields
    const batch = await tx.batch.update({
      where: { id },
      data: batchData,
    });

    // 2. Update primary trainer if specified
    if (primaryTrainerId) {
      const trainer = await tx.trainer.findUnique({ where: { id: primaryTrainerId } });
      if (!trainer) {
        throw new AppError('Trainer not found', 404, 'TRAINER_NOT_FOUND');
      }

      // Check if there is already a primary trainer
      const existingPrimary = await tx.batchTrainer.findFirst({
        where: { batchId: id, isPrimary: true },
      });

      if (existingPrimary) {
        // Demote existing primary
        await tx.batchTrainer.update({
          where: { id: existingPrimary.id },
          data: { isPrimary: false },
        });
      }

      // Check if this trainer is already linked to the batch
      const existingLink = await tx.batchTrainer.findUnique({
        where: {
          batchId_trainerId: {
            batchId: id,
            trainerId: primaryTrainerId,
          },
        },
      });

      if (existingLink) {
        await tx.batchTrainer.update({
          where: { id: existingLink.id },
          data: { isPrimary: true },
        });
      } else {
        await tx.batchTrainer.create({
          data: {
            batchId: id,
            trainerId: primaryTrainerId,
            isPrimary: true,
          },
        });
      }
    }

    return batch;
  });
}

export async function enrollStudents(batchId: string, studentIds: string[], enrollerId: string) {
  const batch = await getBatchById(batchId);

  // Check if adding exceeds capacity
  const activeCount = batch.batchStudents.length;
  if (activeCount + studentIds.length > batch.capacity) {
    throw new AppError('Enrollment exceeds batch capacity', 400, 'BATCH_OVER_CAPACITY');
  }

  const enrollmentResults: any[] = [];
  const errors: string[] = [];

  for (const studentId of studentIds) {
    try {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) {
        errors.push(`Student ID ${studentId} not found`);
        continue;
      }

      // Check if student is already enrolled in this batch
      const existing = await prisma.batchStudent.findUnique({
        where: {
          batchId_studentId: {
            batchId,
            studentId,
          },
        },
      });

      if (existing) {
        if (existing.status === 'ACTIVE') {
          errors.push(`Student ${student.studentCode} is already actively enrolled`);
          continue;
        } else {
          // Re-activate enrollment
          const updated = await prisma.batchStudent.update({
            where: { id: existing.id },
            data: { status: 'ACTIVE', enrolledBy: enrollerId, enrolledAt: new Date() },
          });
          enrollmentResults.push(updated);
        }
      } else {
        // Create new enrollment
        const created = await prisma.batchStudent.create({
          data: {
            batchId,
            studentId,
            enrolledBy: enrollerId,
            status: 'ACTIVE',
          },
        });
        enrollmentResults.push(created);
      }
    } catch (err: any) {
      errors.push(`Failed to enroll student ${studentId}: ${err.message}`);
    }
  }

  return {
    successCount: enrollmentResults.length,
    failedCount: errors.length,
    enrollments: enrollmentResults,
    errors,
  };
}

export async function unenrollStudent(batchId: string, studentId: string) {
  const enrollment = await prisma.batchStudent.findUnique({
    where: {
      batchId_studentId: {
        batchId,
        studentId,
      },
    },
  });

  if (!enrollment) {
    throw new AppError('Student is not enrolled in this batch', 404, 'ENROLLMENT_NOT_FOUND');
  }

  // Set status to DROPPED (rather than hard delete to retain historical grades/attendance)
  return prisma.batchStudent.update({
    where: { id: enrollment.id },
    data: {
      status: 'DROPPED',
    },
  });
}
