import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getPaginationOffset } from '../../utils/pagination';

// Helper to generate slug from title
function generateSlug(title: string): string {
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
  
  // Add unique suffix
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${slug}-${suffix}`;
}

// =================== COURSE SERVICES ===================

export async function createCourse(data: any, creatorId: string) {
  const slug = generateSlug(data.title);
  
  return prisma.course.create({
    data: {
      ...data,
      slug,
      createdBy: creatorId,
    },
  });
}

export async function getCourses(page: number, limit: number, search?: string, userRole?: string) {
  const { skip, take } = getPaginationOffset(page, limit);

  const where: any = {
    deletedAt: null,
    // Students can only see published courses
    ...(userRole === 'STUDENT' && { status: 'PUBLISHED' }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        thumbnailUrl: true,
        category: true,
        difficulty: true,
        status: true,
        durationHours: true,
        createdAt: true,
        _count: {
          select: {
            modules: true,
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

export async function getCourseById(id: string, userRole?: string) {
  const course = await prisma.course.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(userRole === 'STUDENT' && { status: 'PUBLISHED' }),
    },
    include: {
      modules: {
        orderBy: { sortOrder: 'asc' },
        include: {
          lessons: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              sortOrder: true,
              lessonType: true,
              durationMinutes: true,
              isPreview: true,
              isMandatory: true,
              // If student, do not return content text to prevent leak of paid modules
              ...(userRole !== 'STUDENT' && { contentText: true, externalUrl: true }),
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
  }

  return course;
}

export async function updateCourse(id: string, data: any) {
  const course = await prisma.course.findUnique({
    where: { id },
  });
  if (!course || course.deletedAt) {
    throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
  }

  const updates: any = { ...data };
  if (data.title && data.title !== course.title) {
    updates.slug = generateSlug(data.title);
  }

  return prisma.course.update({
    where: { id },
    data: updates,
  });
}

export async function publishCourse(id: string, status: string) {
  const course = await prisma.course.findUnique({
    where: { id },
  });
  if (!course || course.deletedAt) {
    throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
  }

  return prisma.course.update({
    where: { id },
    data: {
      status: status as any,
      ...(status === 'PUBLISHED' && { publishedAt: new Date() }),
    },
  });
}

export async function deleteCourse(id: string) {
  const course = await prisma.course.findUnique({
    where: { id },
  });
  if (!course || course.deletedAt) {
    throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
  }

  return prisma.course.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// =================== MODULE SERVICES ===================

export async function createModule(courseId: string, data: any) {
  // Check if course exists
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.deletedAt) {
    throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
  }

  return prisma.module.create({
    data: {
      ...data,
      courseId,
    },
  });
}

export async function updateModule(moduleId: string, data: any) {
  const moduleRecord = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!moduleRecord) {
    throw new AppError('Module not found', 404, 'MODULE_NOT_FOUND');
  }

  return prisma.module.update({
    where: { id: moduleId },
    data,
  });
}

export async function deleteModule(moduleId: string) {
  const moduleRecord = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!moduleRecord) {
    throw new AppError('Module not found', 404, 'MODULE_NOT_FOUND');
  }

  return prisma.module.delete({
    where: { id: moduleId },
  });
}

// =================== LESSON SERVICES ===================

export async function createLesson(moduleId: string, data: any) {
  const moduleRecord = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!moduleRecord) {
    throw new AppError('Module not found', 404, 'MODULE_NOT_FOUND');
  }

  return prisma.lesson.create({
    data: {
      ...data,
      moduleId,
    },
  });
}

export async function updateLesson(lessonId: string, data: any) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
  }

  return prisma.lesson.update({
    where: { id: lessonId },
    data,
  });
}

export async function deleteLesson(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
  }

  return prisma.lesson.delete({
    where: { id: lessonId },
  });
}
