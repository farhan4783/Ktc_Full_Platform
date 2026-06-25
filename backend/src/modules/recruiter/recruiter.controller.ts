import { Request, Response, NextFunction } from 'express';
import * as recruiterService from './recruiter.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import * as archiver from 'archiver';

export async function registerRecruiter(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, firstName, lastName, companyName, designation, website } = req.body;
    
    const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await recruiterService.registerRecruiter({
      email,
      passwordHash,
      firstName,
      lastName,
      companyName,
      designation,
      website,
    });

    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const profile = await recruiterService.getRecruiterProfile(req.user.userId);
    sendSuccess(res, profile, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const updated = await recruiterService.updateRecruiterProfile(req.user.userId, req.body);
    sendSuccess(res, updated, 200);
  } catch (error) {
    next(error);
  }
}

export async function getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Check if recruiter is approved
    if (req.user?.role === 'RECRUITER') {
      const recruiter = await prisma.recruiter.findUnique({
        where: { userId: req.user.userId },
      });
      if (!recruiter || !recruiter.isApproved) {
        throw new AppError('Access denied: Recruiter account is not approved yet', 403, 'AWAITING_APPROVAL');
      }
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const filters = {
      search: req.query.search ? String(req.query.search) : undefined,
      skills: req.query.skills ? String(req.query.skills).split(',').map(s => s.trim()).filter(Boolean) : undefined,
      minCgpa: req.query.minCgpa ? Number(req.query.minCgpa) : undefined,
      minReadiness: req.query.minReadiness ? Number(req.query.minReadiness) : undefined,
      page,
      limit,
    };

    const result = await recruiterService.getStudentsForRecruiter(filters);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getJobInterests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { jobId } = req.params;
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const interests = await recruiterService.getJobInterests(jobId, req.user.userId);
    sendSuccess(res, interests, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateJobInterest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { jobId, studentId } = req.params;
    const { status } = req.body;
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const updated = await recruiterService.updateJobInterestStatus(jobId, studentId, status, req.user.userId);
    sendSuccess(res, updated, 200);
  } catch (error) {
    next(error);
  }
}

export async function bulkDownloadResumes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Recruiter needs approval
    if (req.user?.role === 'RECRUITER') {
      const recruiter = await prisma.recruiter.findUnique({
        where: { userId: req.user.userId },
      });
      if (!recruiter || !recruiter.isApproved) {
        throw new AppError('Access denied: Recruiter account is not approved yet', 403, 'AWAITING_APPROVAL');
      }
    }

    const { studentIds } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError('No student IDs provided', 400, 'BAD_REQUEST');
    }

    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        user: { deletedAt: null },
      },
      include: { user: true },
    });

    if (students.length === 0) {
      throw new AppError('No matching students found', 404, 'NOT_FOUND');
    }

    // Set headers for ZIP stream
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="student_resumes.zip"');

    const archive = (archiver as any)('zip', { zlib: { level: 9 } });

    // Handle archive errors
    archive.on('error', (err: any) => {
      throw err;
    });

    archive.pipe(res);

    for (const student of students) {
      const nameKey = `${student.user.firstName}_${student.user.lastName}_${student.studentCode}`.replace(/[^a-zA-Z0-9_-]/g, '_');

      if (student.resumeUrl) {
        try {
          const response = await fetch(student.resumeUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            archive.append(Buffer.from(arrayBuffer), { name: `${nameKey}_Resume.pdf` });
          } else {
            archive.append(`Could not fetch resume from ${student.resumeUrl} (HTTP status: ${response.status})`, { name: `${nameKey}_missing_resume.txt` });
          }
        } catch (err: any) {
          archive.append(`Failed to download resume: ${err.message}`, { name: `${nameKey}_error.txt` });
        }
      } else {
        archive.append(`Student has not uploaded a resume yet.`, { name: `${nameKey}_no_resume.txt` });
      }
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
}
