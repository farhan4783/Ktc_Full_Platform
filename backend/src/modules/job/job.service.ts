import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getPaginationOffset } from '../../utils/pagination';

export async function createJob(data: any, postedBy: string) {
  return prisma.jobOpportunity.create({
    data: {
      ...data,
      postedBy,
    },
  });
}

export async function getJobs(page: number, limit: number, user: any, search?: string) {
  const { skip, take } = getPaginationOffset(page, limit);

  const where: any = {
    isActive: true,
  };

  // If student, filter by target college and batch
  if (user.role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { userId: user.userId },
      include: { batchStudents: true },
    });

    if (student) {
      const collegeId = student.collegeId;
      const batchIds = student.batchStudents.map((bs) => bs.batchId);

      where.AND = [
        {
          OR: [
            { targetColleges: { has: collegeId } },
            { targetColleges: { equals: [] } },
          ],
        },
        {
          OR: [
            { targetBatches: { hasSome: batchIds } },
            { targetBatches: { equals: [] } },
          ],
        },
      ];
    }
  } else if (user.role === 'COLLEGE_ADMIN') {
    // College Admin can see all jobs, or jobs targeting their college
    where.OR = [
      { targetColleges: { has: user.collegeId } },
      { targetColleges: { equals: [] } },
    ];
  }

  if (search) {
    where.OR = [
      ...(where.OR || []),
      { title: { contains: search, mode: 'insensitive' } },
      { companyName: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.jobOpportunity.count({ where }),
    prisma.jobOpportunity.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { interests: true },
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

export async function getJobById(id: string) {
  const job = await prisma.jobOpportunity.findUnique({
    where: { id },
    include: {
      interests: {
        include: {
          student: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      },
    },
  });

  if (!job) {
    throw new AppError('Job opportunity not found', 404, 'JOB_NOT_FOUND');
  }

  return job;
}

export async function updateJob(id: string, data: any) {
  await getJobById(id);

  return prisma.jobOpportunity.update({
    where: { id },
    data,
  });
}

export async function deleteJob(id: string) {
  await getJobById(id);

  return prisma.jobOpportunity.delete({
    where: { id },
  });
}

export async function trackInterest(jobId: string, studentId: string, status: any) {
  // Verify job exists
  const job = await prisma.jobOpportunity.findUnique({
    where: { id: jobId },
  });
  if (!job || !job.isActive) {
    throw new AppError('Job opportunity not found or inactive', 404, 'JOB_NOT_FOUND');
  }

  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });
  if (!student) {
    throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
  }

  // Upsert the interest record
  return prisma.jobInterest.upsert({
    where: {
      jobId_studentId: {
        jobId,
        studentId,
      },
    },
    create: {
      jobId,
      studentId,
      status,
    },
    update: {
      status,
    },
  });
}

export async function getStudentInterests(studentId: string) {
  return prisma.jobInterest.findMany({
    where: { studentId },
    include: {
      job: true,
    },
  });
}
