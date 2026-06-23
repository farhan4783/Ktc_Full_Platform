import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getPaginationOffset } from '../../utils/pagination';

export async function createPlacementRecord(data: any, creatorId: string) {
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
  });

  if (!student) {
    throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
  }

  return prisma.$transaction(async (tx) => {
    const record = await tx.placementRecord.create({
      data: {
        ...data,
        createdBy: creatorId,
        isVerified: false, // Must be verified by admin
      },
    });

    // If student is placed, update status to ACTIVELY_APPLYING or PLACED depending on verification/creation
    // Let's set to PLACED if it's full time and auto-verified (e.g. if creator is Admin)
    const isCreatorAdmin = await tx.user.findFirst({
      where: { id: creatorId, role: { in: ['SUPER_ADMIN', 'COLLEGE_ADMIN'] } },
    });

    if (isCreatorAdmin) {
      await tx.placementRecord.update({
        where: { id: record.id },
        data: { isVerified: true, verifiedBy: creatorId },
      });

      if (data.offerType === 'FULL_TIME' || data.offerType === 'INTERNSHIP') {
        await tx.student.update({
          where: { id: data.studentId },
          data: { placementStatus: 'PLACED' },
        });
      }
    }

    return record;
  });
}

export async function getPlacementRecords(page: number, limit: number, user: any, search?: string) {
  const { skip, take } = getPaginationOffset(page, limit);

  const where: any = {};

  if (user.role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { userId: user.userId },
    });
    where.studentId = student?.id || 'none';
  } else if (user.role === 'COLLEGE_ADMIN') {
    where.student = {
      collegeId: user.collegeId,
    };
  }

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { roleTitle: { contains: search, mode: 'insensitive' } },
      { student: { user: { firstName: { contains: search, mode: 'insensitive' } } } },
      { student: { user: { lastName: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.placementRecord.count({ where }),
    prisma.placementRecord.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        document: true,
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

export async function getPlacementRecordById(id: string) {
  const record = await prisma.placementRecord.findUnique({
    where: { id },
    include: {
      student: {
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
      document: true,
    },
  });

  if (!record) {
    throw new AppError('Placement record not found', 404, 'PLACEMENT_NOT_FOUND');
  }

  return record;
}

export async function updatePlacementRecord(id: string, data: any) {
  await getPlacementRecordById(id);

  return prisma.placementRecord.update({
    where: { id },
    data,
  });
}

export async function deletePlacementRecord(id: string) {
  await getPlacementRecordById(id);

  return prisma.placementRecord.delete({
    where: { id },
  });
}

export async function verifyPlacementRecord(id: string, verifierId: string, isVerified: boolean, notes?: string | null) {
  const record = await getPlacementRecordById(id);

  return prisma.$transaction(async (tx) => {
    const updatedRecord = await tx.placementRecord.update({
      where: { id },
      data: {
        isVerified,
        verifiedBy: verifierId,
        notes: notes !== undefined ? notes : record.notes,
      },
    });

    if (isVerified && (record.offerType === 'FULL_TIME' || record.offerType === 'INTERNSHIP')) {
      await tx.student.update({
        where: { id: record.studentId },
        data: { placementStatus: 'PLACED' },
      });
    }

    return updatedRecord;
  });
}

// Student Document features
export async function createStudentDocument(data: any, uploadedBy: string) {
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
  });

  if (!student) {
    throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
  }

  return prisma.studentDocument.create({
    data: {
      ...data,
      uploadedBy,
    },
  });
}

export async function getStudentDocuments(studentId: string) {
  return prisma.studentDocument.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteStudentDocument(id: string) {
  const document = await prisma.studentDocument.findUnique({
    where: { id },
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  return prisma.studentDocument.delete({
    where: { id },
  });
}
