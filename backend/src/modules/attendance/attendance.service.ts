import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export async function createSession(data: any) {
  // Check if batch exists
  const batch = await prisma.batch.findUnique({
    where: { id: data.batchId },
    include: {
      _count: {
        select: {
          batchStudents: { where: { status: 'ACTIVE' } },
        },
      },
    },
  });

  if (!batch) {
    throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
  }

  return prisma.classSession.create({
    data: {
      ...data,
      totalStudents: batch._count.batchStudents,
      attendanceMarked: false,
    },
  });
}

export async function markSessionAttendance(sessionId: string, records: any[], markerId: string) {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      batch: {
        include: {
          batchStudents: {
            where: { status: 'ACTIVE' },
            select: { studentId: true },
          },
        },
      },
    },
  });

  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  // Get valid student IDs in the batch
  const validStudentIds = new Set(session.batch.batchStudents.map((s) => s.studentId));

  return prisma.$transaction(async (tx) => {
    let presentCount = 0;

    for (const record of records) {
      if (!validStudentIds.has(record.studentId)) {
        throw new AppError(`Student ${record.studentId} is not actively enrolled in this batch`, 400, 'INVALID_STUDENT');
      }

      // Upsert attendance record
      await tx.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId,
            studentId: record.studentId,
          },
        },
        create: {
          sessionId,
          studentId: record.studentId,
          status: record.status,
          markedBy: markerId,
          overrideReason: record.overrideReason,
        },
        update: {
          status: record.status,
          markedBy: markerId,
          overrideReason: record.overrideReason,
        },
      });

      if (record.status === 'PRESENT' || record.status === 'LATE') {
        presentCount++;
      }
    }

    // Update session status
    const updatedSession = await tx.classSession.update({
      where: { id: sessionId },
      data: {
        presentCount,
        attendanceMarked: true,
        attendanceMarkedAt: new Date(),
      },
    });

    // Asynchronously check and send WhatsApp warnings for low attendance
    setTimeout(async () => {
      try {
        const sessionWithBatch = await prisma.classSession.findUnique({
          where: { id: sessionId },
          include: {
            batch: {
              include: {
                course: {
                  select: { minAttendancePct: true }
                }
              }
            }
          }
        });
        if (!sessionWithBatch) return;
        const minPct = sessionWithBatch.batch.course?.minAttendancePct ?? 75;

        for (const record of records) {
          const student = await prisma.student.findUnique({
            where: { id: record.studentId },
            include: {
              user: {
                select: { firstName: true, phone: true }
              }
            }
          });

          if (student && student.user.phone) {
            const sessionsInBatch = await prisma.classSession.findMany({
              where: { batchId: sessionWithBatch.batchId, attendanceMarked: true },
              select: { id: true }
            });
            const totalMarkedSessions = sessionsInBatch.length;

            if (totalMarkedSessions > 0) {
              const presentCount = await prisma.attendanceRecord.count({
                where: {
                  studentId: student.id,
                  sessionId: { in: sessionsInBatch.map(s => s.id) },
                  status: { in: ['PRESENT', 'LATE'] }
                }
              });

              const attendancePct = (presentCount / totalMarkedSessions) * 100;
              if (attendancePct < minPct) {
                const { sendWhatsAppAttendanceWarning } = require('../../services/whatsapp.service');
                await sendWhatsAppAttendanceWarning(student.user.phone, attendancePct, student.user.firstName);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to process WhatsApp low attendance warnings', err);
      }
    }, 0);

    return updatedSession;
  });
}

export async function getBatchAttendanceGrid(batchId: string) {
  // Fetch batch details
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
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
      classSessions: {
        orderBy: { sessionDate: 'asc' },
      },
    },
  });

  if (!batch) {
    throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
  }

  const sessions = batch.classSessions;
  const students = batch.batchStudents.map((bs) => bs.student);

  // Fetch all attendance records for these sessions
  const sessionIds = sessions.map((s) => s.id);
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      sessionId: { in: sessionIds },
    },
  });

  // Map attendance records to a dictionary for faster lookups: key = "studentId_sessionId"
  const attendanceMap = new Map<string, string>();
  for (const record of attendanceRecords) {
    attendanceMap.set(`${record.studentId}_${record.sessionId}`, record.status);
  }

  // Build grid
  const grid = students.map((student) => {
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    const sessionAttendance = sessions.map((session) => {
      const status = attendanceMap.get(`${student.id}_${session.id}`) || 'ABSENT'; // Default to absent if unmarked
      
      if (status === 'PRESENT') presentCount++;
      else if (status === 'ABSENT') absentCount++;
      else if (status === 'LATE') {
        lateCount++;
        presentCount++; // Late counts as present for percentage
      } else if (status === 'EXCUSED') excusedCount++;

      return {
        sessionId: session.id,
        sessionDate: session.sessionDate,
        status,
      };
    });

    const totalMarkedSessions = sessions.filter((s) => s.attendanceMarked).length;
    const attendancePercentage = totalMarkedSessions > 0 
      ? ((presentCount) / totalMarkedSessions) * 100 
      : 100; // 100% if no sessions have been marked yet

    return {
      studentId: student.id,
      studentCode: student.studentCode,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      attendancePercentage: parseFloat(attendancePercentage.toFixed(2)),
      summary: {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
        total: totalMarkedSessions,
      },
      sessions: sessionAttendance,
    };
  });

  return {
    batchId,
    batchName: batch.name,
    batchCode: batch.code,
    sessions: sessions.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
      topicCovered: s.topicCovered,
      attendanceMarked: s.attendanceMarked,
    })),
    grid,
  };
}
