import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export async function createQuiz(data: any, creatorId: string) {
  return prisma.quiz.create({
    data: {
      ...data,
      createdBy: creatorId,
    },
  });
}

export async function addQuizQuestion(quizId: string, data: any) {
  const { options, ...questionData } = data;

  // Check if quiz exists
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) {
    throw new AppError('Quiz not found', 404, 'QUIZ_NOT_FOUND');
  }

  return prisma.$transaction(async (tx) => {
    const question = await tx.quizQuestion.create({
      data: {
        ...questionData,
        quizId,
      },
    });

    // Create options
    if (options && options.length > 0) {
      await tx.questionOption.createMany({
        data: options.map((opt: any) => ({
          ...opt,
          questionId: question.id,
        })),
      });
    }

    return tx.quizQuestion.findUnique({
      where: { id: question.id },
      include: { options: true },
    });
  });
}

export async function startQuizAttempt(quizId: string, studentId: string, ipAddress?: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      attempts: {
        where: { studentId },
      },
    },
  });

  if (!quiz || quiz.status !== 'PUBLISHED') {
    throw new AppError('Quiz is not available', 404, 'QUIZ_NOT_AVAILABLE');
  }

  // Check attempts count
  const attemptCount = quiz.attempts.length;
  if (attemptCount >= quiz.attemptsAllowed) {
    throw new AppError('You have reached the maximum attempts allowed for this quiz', 400, 'MAX_ATTEMPTS_EXCEEDED');
  }

  // Check availability dates
  const now = new Date();
  if (quiz.availableFrom && now < quiz.availableFrom) {
    throw new AppError('Quiz is not available yet', 400, 'QUIZ_NOT_STARTED');
  }
  if (quiz.availableUntil && now > quiz.availableUntil) {
    throw new AppError('Quiz has expired', 400, 'QUIZ_EXPIRED');
  }

  // Start new attempt
  return prisma.quizAttempt.create({
    data: {
      quizId,
      studentId,
      attemptNumber: attemptCount + 1,
      startedAt: new Date(),
      status: 'IN_PROGRESS',
      ipAddress: ipAddress || null,
    },
  });
}

export async function submitQuizAttempt(attemptId: string, studentId: string, submittedAnswers: any[]) {
  // Fetch attempt
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: {
            include: {
              options: true,
            },
          },
        },
      },
    },
  });

  if (!attempt) {
    throw new AppError('Quiz attempt not found', 404, 'ATTEMPT_NOT_FOUND');
  }

  if (attempt.studentId !== studentId) {
    throw new AppError('Access denied: Scoped student access only', 403, 'FORBIDDEN');
  }

  if (attempt.status !== 'IN_PROGRESS') {
    throw new AppError('Quiz has already been submitted', 400, 'ATTEMPT_ALREADY_SUBMITTED');
  }

  const now = new Date();
  const timeTakenSecs = Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000);

  // Check if attempt is expired (give 30 seconds grace period)
  if (attempt.quiz.timeLimitMins) {
    const timeLimitSecs = attempt.quiz.timeLimitMins * 60;
    if (timeTakenSecs > timeLimitSecs + 30) {
      // Mark as TIMED_OUT instead of letting submit answers
      await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'TIMED_OUT',
          submittedAt: now,
          timeTakenSecs,
          score: 0,
          passed: false,
          percentage: 0,
        },
      });
      throw new AppError('Quiz submission rejected: Time limit exceeded', 400, 'TIME_EXCEEDED');
    }
  }

  const questions = attempt.quiz.questions;
  let totalScore = 0;
  let maxScore = 0;

  return prisma.$transaction(async (tx) => {
    for (const question of questions) {
      maxScore += question.marks;

      const submitted = submittedAnswers.find((ans) => ans.questionId === question.id);
      const selectedOptionIds = submitted?.selectedOptionIds || [];
      const textAnswer = submitted?.textAnswer || null;

      let isCorrect = false;
      let marksAwarded = 0;

      // Grade MCQ
      if (question.questionType === 'MCQ_SINGLE' || question.questionType === 'MCQ_MULTIPLE' || question.questionType === 'TRUE_FALSE') {
        const correctOptionIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
        
        // Check if user selected exactly the correct options
        const isMatch = selectedOptionIds.length === correctOptionIds.length &&
          selectedOptionIds.every((id: string) => correctOptionIds.includes(id));

        if (isMatch) {
          isCorrect = true;
          marksAwarded = question.marks;
          totalScore += question.marks;
        }
      }

      // Save answer record
      await tx.quizAnswer.create({
        data: {
          attemptId,
          questionId: question.id,
          selectedOptionIds,
          textAnswer,
          isCorrect,
          marksAwarded,
        },
      });
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = totalScore >= attempt.quiz.passMarks;

    // Update attempt record
    return tx.quizAttempt.update({
      where: { id: attemptId },
      data: {
        submittedAt: now,
        timeTakenSecs,
        score: totalScore,
        maxScore,
        percentage: parseFloat(percentage.toFixed(2)),
        passed,
        status: 'SUBMITTED',
      },
    });
  });
}

export async function getQuizLeaderboard(quizId: string) {
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId, status: 'SUBMITTED' },
    orderBy: [
      { score: 'desc' },
      { timeTakenSecs: 'asc' },
    ],
    take: 10,
    include: {
      student: {
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

  return attempts.map((att, idx) => ({
    rank: idx + 1,
    studentCode: att.student.studentCode,
    firstName: att.student.user.firstName,
    lastName: att.student.user.lastName,
    score: att.score,
    maxScore: att.maxScore,
    percentage: att.percentage,
    timeTakenSecs: att.timeTakenSecs,
    submittedAt: att.submittedAt,
  }));
}
