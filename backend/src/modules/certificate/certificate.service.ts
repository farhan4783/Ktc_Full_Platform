import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { generateCertificatePdf } from '../../services/pdf.service';
import { uploadFileBuffer } from '../../services/storage.service';

export async function validateEligibility(studentId: string, courseId: string, batchId: string) {
  // 1. Fetch Student, Course, Batch
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });
  if (!student) {
    throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });
  if (!course) {
    throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
  }

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
  });
  if (!batch) {
    throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
  }

  // 2. Calculate Attendance Percentage
  // Get all class sessions for this batch that have attendance marked
  const markedSessions = await prisma.classSession.findMany({
    where: { batchId, attendanceMarked: true },
    select: { id: true },
  });

  let attendancePct = 100;
  if (markedSessions.length > 0) {
    const sessionIds = markedSessions.map((s) => s.id);
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        studentId,
        sessionId: { in: sessionIds },
      },
      select: { status: true },
    });

    const presentCount = attendanceRecords.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE'
    ).length;

    attendancePct = (presentCount / markedSessions.length) * 100;
  }

  // 3. Calculate Quiz Average Percentage
  // Get all published quizzes for this batch and course
  const quizzes = await prisma.quiz.findMany({
    where: {
      batchId,
      courseId,
      status: 'PUBLISHED',
    },
    select: { id: true },
  });

  let quizAvgPct = 100;
  if (quizzes.length > 0) {
    let totalPct = 0;
    for (const quiz of quizzes) {
      // Find highest score/percentage for this quiz by this student
      const highestAttempt = await prisma.quizAttempt.findFirst({
        where: {
          quizId: quiz.id,
          studentId,
          status: 'SUBMITTED',
        },
        orderBy: { percentage: 'desc' },
        select: { percentage: true },
      });
      totalPct += highestAttempt?.percentage || 0;
    }
    quizAvgPct = totalPct / quizzes.length;
  }

  // 4. Calculate Assignment Completion / Grading
  const assignments = await prisma.assignment.findMany({
    where: {
      batchId,
      courseId,
      status: 'PUBLISHED',
    },
    select: { id: true },
  });

  let isAssignmentsEligible = true;
  let gradedAssignmentsCount = 0;
  if (assignments.length > 0) {
    const assignmentIds = assignments.map((a) => a.id);
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId,
        assignmentId: { in: assignmentIds },
        status: 'GRADED',
      },
      select: { id: true },
    });
    gradedAssignmentsCount = submissions.length;
    isAssignmentsEligible = submissions.length === assignments.length;
  }

  // 5. Check eligibility thresholds
  const isAttendanceEligible = attendancePct >= course.minAttendancePct;
  const isQuizEligible = quizAvgPct >= course.minQuizAvgPct;
  const isEligible = isAttendanceEligible && isQuizEligible && isAssignmentsEligible;

  return {
    isEligible,
    attendancePct: parseFloat(attendancePct.toFixed(2)),
    minAttendanceRequired: course.minAttendancePct,
    quizAvgPct: parseFloat(quizAvgPct.toFixed(2)),
    minQuizAvgRequired: course.minQuizAvgPct,
    gradedAssignmentsCount,
    totalAssignmentsCount: assignments.length,
    details: {
      isAttendanceEligible,
      isQuizEligible,
      isAssignmentsEligible,
    },
  };
}

export async function generateCertificate(
  studentId: string,
  courseId: string,
  batchId: string,
  issuedBy: string
) {
  // Validate eligibility first
  const eligibility = await validateEligibility(studentId, courseId, batchId);
  if (!eligibility.isEligible) {
    throw new AppError(
      `Student is not eligible for certificate. Attendance: ${eligibility.attendancePct}% (Req: ${eligibility.minAttendanceRequired}%), Quiz Avg: ${eligibility.quizAvgPct}% (Req: ${eligibility.minQuizAvgRequired}%)`,
      400,
      'INELIGIBLE'
    );
  }

  // Check if certificate already exists
  const existing = await prisma.certificate.findFirst({
    where: { studentId, courseId, batchId, isValid: true },
  });
  if (existing) {
    return existing;
  }

  // Get student and course details for PDF generation
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!student || !course) {
    throw new AppError('Student or Course not found', 404, 'NOT_FOUND');
  }

  // Generate unique certificate code
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const certificateCode = `KTC-${student.studentCode}-${rand}`;

  // Generate PDF buffer
  const pdfBuffer = await generateCertificatePdf(
    `${student.user.firstName} ${student.user.lastName}`,
    course.title,
    student.studentCode,
    certificateCode,
    new Date()
  );

  // Upload PDF to R2
  const fileKey = `certificates/${student.id}/${certificateCode}.pdf`;
  const pdfUrl = await uploadFileBuffer(fileKey, pdfBuffer, 'application/pdf');

  // Create Certificate record in database
  return prisma.certificate.create({
    data: {
      certificateCode,
      studentId,
      courseId,
      batchId,
      issuedBy,
      pdfUrl,
      isValid: true,
      metadata: {
        attendancePct: eligibility.attendancePct,
        quizAvgPct: eligibility.quizAvgPct,
      },
    },
  });
}

export async function verifyCertificate(code: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateCode: code },
    include: {
      student: {
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      course: {
        select: { title: true },
      },
      batch: {
        select: { name: true, code: true },
      },
    },
  });

  if (!certificate) {
    throw new AppError('Certificate not found or invalid code', 404, 'CERTIFICATE_NOT_FOUND');
  }

  return certificate;
}

export async function getStudentCertificates(studentId: string) {
  return prisma.certificate.findMany({
    where: { studentId, isValid: true },
    include: {
      course: {
        select: { title: true },
      },
      batch: {
        select: { name: true },
      },
    },
  });
}
