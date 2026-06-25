import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { calculateReadinessScore } from '../student/student.service';

export async function registerRecruiter(data: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  companyName: string;
  designation?: string;
  website?: string;
}) {
  return prisma.$transaction(async (tx) => {
    // Check if user already exists
    const existing = await tx.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new AppError('Email is already registered', 400, 'EMAIL_EXISTS');
    }

    const user = await tx.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        role: 'RECRUITER',
        firstName: data.firstName,
        lastName: data.lastName,
        isEmailVerified: true,
        isActive: true,
      },
    });

    const recruiter = await tx.recruiter.create({
      data: {
        userId: user.id,
        companyName: data.companyName,
        designation: data.designation || null,
        website: data.website || null,
        isApproved: false, // Default is false, requires admin approval
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      recruiter,
    };
  });
}

export async function getRecruiterProfile(userId: string) {
  const recruiter = await prisma.recruiter.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
        },
      },
    },
  });

  if (!recruiter) {
    throw new AppError('Recruiter profile not found', 404, 'RECRUITER_NOT_FOUND');
  }

  return recruiter;
}

export async function updateRecruiterProfile(userId: string, data: any) {
  const recruiter = await prisma.recruiter.findUnique({
    where: { userId },
  });

  if (!recruiter) {
    throw new AppError('Recruiter profile not found', 404, 'RECRUITER_NOT_FOUND');
  }

  return prisma.$transaction(async (tx) => {
    // Update user table
    const userUpdates: any = {};
    if (data.firstName) userUpdates.firstName = data.firstName;
    if (data.lastName) userUpdates.lastName = data.lastName;

    if (Object.keys(userUpdates).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: userUpdates,
      });
    }

    // Update recruiter table
    const recruiterUpdates: any = {};
    if (data.companyName) recruiterUpdates.companyName = data.companyName;
    if (data.designation !== undefined) recruiterUpdates.designation = data.designation;
    if (data.website !== undefined) recruiterUpdates.website = data.website;

    return tx.recruiter.update({
      where: { userId },
      data: recruiterUpdates,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  });
}

export async function updateRecruiterApproval(recruiterId: string, isApproved: boolean) {
  const recruiter = await prisma.recruiter.findUnique({
    where: { id: recruiterId },
  });
  if (!recruiter) {
    throw new AppError('Recruiter not found', 404, 'RECRUITER_NOT_FOUND');
  }

  return prisma.recruiter.update({
    where: { id: recruiterId },
    data: { isApproved },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

export async function getRecruiters(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [total, items] = await prisma.$transaction([
    prisma.recruiter.count(),
    prisma.recruiter.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function getStudentsForRecruiter(filters: {
  search?: string;
  skills?: string[];
  minCgpa?: number;
  minReadiness?: number;
  page: number;
  limit: number;
}) {
  // Fetch active students from the database
  const students = await prisma.student.findMany({
    where: {
      user: {
        deletedAt: null,
        isActive: true,
      },
      ...(filters.minCgpa !== undefined && {
        cgpa: { gte: filters.minCgpa },
      }),
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatarUrl: true,
        },
      },
      college: {
        select: {
          name: true,
        },
      },
    },
  });

  // Calculate readiness score and map in memory
  let filtered = await Promise.all(
    students.map(async (student) => {
      const readinessScore = await calculateReadinessScore(student.id);
      return {
        ...student,
        readinessScore,
      };
    })
  );

  // Apply filters
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter((s) => 
      s.studentCode.toLowerCase().includes(searchLower) ||
      (s.enrollmentNumber && s.enrollmentNumber.toLowerCase().includes(searchLower)) ||
      (s.branch && s.branch.toLowerCase().includes(searchLower)) ||
      s.user.firstName.toLowerCase().includes(searchLower) ||
      s.user.lastName.toLowerCase().includes(searchLower) ||
      s.user.email.toLowerCase().includes(searchLower)
    );
  }

  if (filters.skills && filters.skills.length > 0) {
    const filterSkills = filters.skills.map(sk => sk.toLowerCase().trim());
    filtered = filtered.filter((s) => {
      const studentSkills = s.skills.map(sk => sk.toLowerCase().trim());
      // Match candidate containing ALL searched skills (strict filter)
      return filterSkills.every(sk => studentSkills.includes(sk));
    });
  }

  if (filters.minReadiness !== undefined) {
    filtered = filtered.filter((s) => s.readinessScore >= filters.minReadiness!);
  }

  // Paginate in memory
  const total = filtered.length;
  const skip = (filters.page - 1) * filters.limit;
  const items = filtered.slice(skip, skip + filters.limit);
  const totalPages = Math.ceil(total / filters.limit);

  return {
    items,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages,
      hasNext: filters.page < totalPages,
      hasPrev: filters.page > 1,
    },
  };
}

export async function updateJobInterestStatus(jobId: string, studentId: string, status: any, recruiterUserId: string) {
  // Enforce ownership: only the recruiter who posted the job (or an admin) can update student interest status
  const job = await prisma.jobOpportunity.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new AppError('Job opportunity not found', 404, 'JOB_NOT_FOUND');
  }

  if (job.postedBy !== recruiterUserId) {
    throw new AppError('Access denied: You can only update candidates for jobs you posted', 403, 'FORBIDDEN');
  }

  return prisma.jobInterest.upsert({
    where: {
      jobId_studentId: {
        jobId,
        studentId,
      },
    },
    update: {
      status,
    },
    create: {
      jobId,
      studentId,
      status,
    },
  });
}

export async function getJobInterests(jobId: string, recruiterUserId: string) {
  const job = await prisma.jobOpportunity.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new AppError('Job opportunity not found', 404, 'JOB_NOT_FOUND');
  }

  if (job.postedBy !== recruiterUserId) {
    throw new AppError('Access denied: You can only view candidates for jobs you posted', 403, 'FORBIDDEN');
  }

  return prisma.jobInterest.findMany({
    where: { jobId },
    include: {
      student: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
}
