import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export async function createAssignment(data: any) {
  // If batchId is set, verify it exists
  if (data.batchId) {
    const batch = await prisma.batch.findUnique({ where: { id: data.batchId } });
    if (!batch) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }
  }

  return prisma.assignment.create({
    data,
  });
}

export async function submitAssignment(assignmentId: string, studentId: string, data: any) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment || assignment.status !== 'PUBLISHED') {
    throw new AppError('Assignment is not available', 404, 'ASSIGNMENT_NOT_AVAILABLE');
  }

  // Check if due date has passed
  const isLate = assignment.deadlineAt ? new Date() > assignment.deadlineAt : false;
  if (isLate && !assignment.allowLate) {
    throw new AppError('Submission rejected: Due date has passed and late submissions are disabled', 400, 'DUE_DATE_PASSED');
  }

  // Check if student already submitted (and is graded/locked)
  const existing = await prisma.assignmentSubmission.findFirst({
    where: { assignmentId, studentId },
  });

  if (existing && (existing.status === 'GRADED' || existing.status === 'UNDER_REVIEW')) {
    throw new AppError('You cannot modify this submission as it is already under review or graded', 400, 'SUBMISSION_LOCKED');
  }

  if (existing) {
    // Update existing submission
    return prisma.assignmentSubmission.update({
      where: { id: existing.id },
      data: {
        ...data,
        submittedAt: new Date(),
        status: 'SUBMITTED',
        isLate,
      },
    });
  } else {
    // Create new submission
    return prisma.assignmentSubmission.create({
      data: {
        ...data,
        assignmentId,
        studentId,
        status: 'SUBMITTED',
        isLate,
      },
    });
  }
}

export async function gradeSubmission(submissionId: string, data: any, graderId: string) {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: true,
    },
  });

  if (!submission) {
    throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
  }

  if (data.marksAwarded > submission.assignment.totalMarks) {
    throw new AppError(`Marks awarded cannot exceed assignment limit of ${submission.assignment.totalMarks}`, 400, 'INVALID_SCORE');
  }

  return prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      marksAwarded: data.marksAwarded,
      feedback: data.feedback || null,
      status: 'GRADED',
      gradedBy: graderId,
      gradedAt: new Date(),
    },
  });
}
