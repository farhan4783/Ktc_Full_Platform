import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { UpdateStudentProfileInput } from './student.schema';
import { getPaginationOffset } from '../../utils/pagination';
import { generateStudentCode, generateTempPassword } from '../../utils/codeGenerator';
import bcrypt from 'bcryptjs';

export async function getStudents(
  page: number,
  limit: number,
  filters: {
    search?: string;
    collegeId?: string;
    batchId?: string;
    placementStatus?: string;
    graduationYear?: number;
  }
) {
  const { skip, take } = getPaginationOffset(page, limit);

  const where: any = {
    user: {
      deletedAt: null,
    },
    ...(filters.collegeId && { collegeId: filters.collegeId }),
    ...(filters.placementStatus && { placementStatus: filters.placementStatus as any }),
    ...(filters.graduationYear && { graduationYear: filters.graduationYear }),
    ...(filters.batchId && {
      batchStudents: {
        some: {
          batchId: filters.batchId,
          status: 'ACTIVE',
        },
      },
    }),
    ...(filters.search && {
      OR: [
        { studentCode: { contains: filters.search, mode: 'insensitive' } },
        { enrollmentNumber: { contains: filters.search, mode: 'insensitive' } },
        { branch: { contains: filters.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      ],
    }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.student.count({ where }),
    prisma.student.findMany({
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
            isActive: true,
          },
        },
        college: {
          select: {
            id: true,
            name: true,
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

export async function getStudentById(id: string) {
  const student = await prisma.student.findUnique({
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
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
      college: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      batchStudents: {
        where: { status: 'ACTIVE' },
        include: {
          batch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
      certificates: true,
      placementRecords: true,
    },
  });

  if (!student) {
    throw new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND');
  }

  return student;
}

export async function updateStudent(id: string, data: UpdateStudentProfileInput) {
  const student = await prisma.student.findUnique({
    where: { id },
  });

  if (!student) {
    throw new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND');
  }

  // Update user and student tables in transaction
  return prisma.$transaction(async (tx) => {
    // 1. Update user fields if provided
    const userUpdates: any = {};
    if (data.firstName) userUpdates.firstName = data.firstName;
    if (data.lastName) userUpdates.lastName = data.lastName;
    if (data.phone !== undefined) userUpdates.phone = data.phone;
    if (data.avatarUrl !== undefined) userUpdates.avatarUrl = data.avatarUrl;

    if (Object.keys(userUpdates).length > 0) {
      await tx.user.update({
        where: { id: student.userId },
        data: userUpdates,
      });
    }

    // 2. Update student fields
    const studentUpdates: any = {};
    if (data.enrollmentNumber !== undefined) studentUpdates.enrollmentNumber = data.enrollmentNumber;
    if (data.branch !== undefined) studentUpdates.branch = data.branch;
    if (data.graduationYear !== undefined) studentUpdates.graduationYear = data.graduationYear;
    if (data.cgpa !== undefined) studentUpdates.cgpa = data.cgpa;
    if (data.gender !== undefined) studentUpdates.gender = data.gender;
    if (data.dateOfBirth !== undefined) studentUpdates.dateOfBirth = data.dateOfBirth;
    if (data.resumeUrl !== undefined) studentUpdates.resumeUrl = data.resumeUrl;
    if (data.linkedinUrl !== undefined) studentUpdates.linkedinUrl = data.linkedinUrl;
    if (data.githubUrl !== undefined) studentUpdates.githubUrl = data.githubUrl;
    if (data.skills !== undefined) studentUpdates.skills = data.skills;
    if (data.placementStatus !== undefined) studentUpdates.placementStatus = data.placementStatus;

    // Auto calculate if profile is completed
    const checkFields = [
      student.enrollmentNumber || data.enrollmentNumber,
      student.branch || data.branch,
      student.graduationYear || data.graduationYear,
      student.cgpa || data.cgpa,
      student.resumeUrl || data.resumeUrl,
    ];
    studentUpdates.profileCompleted = checkFields.every(Boolean);

    return tx.student.update({
      where: { id },
      data: studentUpdates,
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

/**
 * Custom robust CSV parser to avoid third-party dependencies
 */
function parseCsv(csvString: string) {
  const lines = csvString.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length !== headers.length) continue;
    
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index];
    });
    records.push(record);
  }
  
  return records;
}

export async function bulkImportStudents(collegeId: string, csvData: string) {
  // Check if college exists
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
  });
  if (!college) {
    throw new AppError('College not found', 404, 'COLLEGE_NOT_FOUND');
  }

  const records = parseCsv(csvData);
  if (records.length === 0) {
    throw new AppError('No student records found in CSV', 400, 'EMPTY_CSV');
  }

  const importedStudents: any[] = [];
  const errors: string[] = [];

  const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

  // Process sequentially to keep it simple and safe for connection pool
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const { firstName, lastName, email, enrollmentNumber, branch, graduationYear, cgpa } = row;

    if (!firstName || !lastName || !email) {
      errors.push(`Row ${i + 2}: Missing required fields (firstName, lastName, email)`);
      continue;
    }

    try {
      // Check if email already registered
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (existingUser) {
        errors.push(`Row ${i + 2}: Email ${email} is already registered`);
        continue;
      }

      // Generate temp credentials
      const tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
      const studentCode = generateStudentCode();

      // Create user + student profile in transaction
      const student = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: email.toLowerCase().trim(),
            passwordHash,
            role: 'STUDENT',
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            isEmailVerified: true, // Auto-verified since imported by admin
            requiresPasswordChange: true, // Require password change on first login
          },
        });

        return tx.student.create({
          data: {
            userId: user.id,
            studentCode,
            collegeId,
            enrollmentNumber: enrollmentNumber ? enrollmentNumber.trim() : null,
            branch: branch ? branch.trim() : null,
            graduationYear: graduationYear ? parseInt(graduationYear) : null,
            cgpa: cgpa ? parseFloat(cgpa) : null,
            profileCompleted: false,
          },
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

      importedStudents.push({
        id: student.id,
        email: student.user.email,
        studentCode: student.studentCode,
        tempPassword, // Return temp password to display to admin/email
      });
    } catch (err: any) {
      errors.push(`Row ${i + 2}: Error importing student: ${err.message}`);
    }
  }

  return {
    successCount: importedStudents.length,
    failedCount: errors.length,
    importedStudents,
    errors,
  };
}

export async function saveProgress(
  studentId: string,
  lessonId: string,
  videoProgressSecs: number,
  isCompleted: boolean
) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  const durationSecs = (lesson?.durationMinutes || 0) * 60;
  const videoCompletedPct = durationSecs > 0 ? (videoProgressSecs / durationSecs) * 100 : 100;

  return prisma.studentProgress.upsert({
    where: {
      studentId_lessonId: {
        studentId,
        lessonId,
      },
    },
    update: {
      videoProgressSecs,
      videoCompletedPct: parseFloat(videoCompletedPct.toFixed(2)),
      isCompleted: isCompleted || videoCompletedPct >= 90,
      completedAt: (isCompleted || videoCompletedPct >= 90) ? new Date() : null,
    },
    create: {
      studentId,
      lessonId,
      videoProgressSecs,
      videoCompletedPct: parseFloat(videoCompletedPct.toFixed(2)),
      isCompleted: isCompleted || videoCompletedPct >= 90,
      completedAt: (isCompleted || videoCompletedPct >= 90) ? new Date() : null,
    },
  });
}
