/// <reference types="node" />
import { PrismaClient, UserRole, PlacementStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing data (optional, but good for clean state)
  // Deletions must occur in reverse dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.notificationRecipient.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.emailVerification.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.batchStudent.deleteMany({});
  await prisma.batchTrainer.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.classSession.deleteMany({});
  await prisma.quizAnswer.deleteMany({});
  await prisma.quizAttempt.deleteMany({});
  await prisma.assignmentSubmission.deleteMany({});
  await prisma.questionOption.deleteMany({});
  await prisma.quizQuestion.deleteMany({});
  await prisma.quiz.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.lessonVideo.deleteMany({});
  await prisma.lessonNote.deleteMany({});
  await prisma.studentNote.deleteMany({});
  await prisma.studentProgress.deleteMany({});
  await prisma.studentActivityLog.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.module.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.studentDocument.deleteMany({});
  await prisma.placementRecord.deleteMany({});
  await prisma.jobInterest.deleteMany({});
  await prisma.jobOpportunity.deleteMany({});
  
  await prisma.student.deleteMany({});
  await prisma.trainer.deleteMany({});
  await prisma.collegeAdmin.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.college.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // 2. Create Users
  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@kodetocareer.com',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      firstName: 'KTC',
      lastName: 'Super Admin',
      isActive: true,
      isEmailVerified: true,
    },
  });

  // College Admin User
  const collegeAdminUser = await prisma.user.create({
    data: {
      email: 'collegeadmin@kodetocareer.com',
      passwordHash,
      role: UserRole.COLLEGE_ADMIN,
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Trainer User
  const trainerUser = await prisma.user.create({
    data: {
      email: 'trainer@kodetocareer.com',
      passwordHash,
      role: UserRole.TRAINER,
      firstName: 'Jane',
      lastName: 'Smith',
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Student User
  const studentUser = await prisma.user.create({
    data: {
      email: 'student@kodetocareer.com',
      passwordHash,
      role: UserRole.STUDENT,
      firstName: 'Alice',
      lastName: 'Johnson',
      isActive: true,
      isEmailVerified: true,
    },
  });

  console.log('Users created.');

  // 3. Create College
  const college = await prisma.college.create({
    data: {
      name: 'KTC Engineering Institute',
      code: 'KTC-EI-001',
      address: '123 Education Lane',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contactName: 'John Doe',
      contactEmail: 'contact@ktcei.edu.in',
      contactPhone: '+919876543210',
      isActive: true,
    },
  });

  // Link College Admin to College
  await prisma.collegeAdmin.create({
    data: {
      userId: collegeAdminUser.id,
      collegeId: college.id,
      permissions: {
        view_students: true,
        download_reports: true,
        manage_batches: true,
      },
    },
  });

  console.log('Colleges and college admin links created.');

  // 4. Create Trainer Profile
  const trainerProfile = await prisma.trainer.create({
    data: {
      userId: trainerUser.id,
      bio: 'Experienced software developer and instructor specializing in TypeScript, React, and Node.js.',
      specialisations: ['TypeScript', 'Node.js', 'React', 'Prisma', 'System Design'],
      experienceYears: 8,
      linkedinUrl: 'https://linkedin.com/in/janesmith-example',
      githubUrl: 'https://github.com/janesmith-example',
    },
  });

  // 5. Create Student Profile
  const studentProfile = await prisma.student.create({
    data: {
      userId: studentUser.id,
      studentCode: 'KTC-2026-00001',
      collegeId: college.id,
      enrollmentNumber: 'ENR-2023-9874',
      branch: 'Computer Science & Engineering',
      graduationYear: 2026,
      cgpa: 8.5,
      gender: 'Female',
      dateOfBirth: new Date('2004-05-15'),
      skills: ['HTML', 'CSS', 'JavaScript', 'SQL'],
      placementStatus: PlacementStatus.NOT_STARTED,
      profileCompleted: true,
    },
  });

  console.log('Trainer and Student profiles created.');

  // 6. Create Course
  const course = await prisma.course.create({
    data: {
      title: 'Full Stack Web Development',
      slug: 'full-stack-web-development',
      shortDescription: 'Comprehensive training in modern web stack.',
      description: 'Learn front-end and back-end web development with React, Node.js, and PostgreSQL.',
      category: 'Web Development',
      durationHours: 120,
      status: 'PUBLISHED',
      isSequential: true,
      minAttendancePct: 75,
      minQuizAvgPct: 60,
    },
  });

  // Add course modules
  const module1 = await prisma.module.create({
    data: {
      courseId: course.id,
      title: 'Module 1: Front-end Basics',
      description: 'Introduction to HTML, CSS, and modern JavaScript.',
      sortOrder: 1,
    },
  });

  const module2 = await prisma.module.create({
    data: {
      courseId: course.id,
      title: 'Module 2: Back-end Basics',
      description: 'Building servers with Express.js and connecting databases with Prisma.',
      sortOrder: 2,
    },
  });

  // Add lessons to module 1
  await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      title: 'HTML & CSS Deep Dive',
      description: 'Learn HTML structure and CSS layouts.',
      sortOrder: 1,
      lessonType: 'TEXT',
      contentText: 'HTML stands for HyperText Markup Language. CSS stands for Cascading Style Sheets.',
      durationMinutes: 45,
      isMandatory: true,
    },
  });

  console.log('Courses, Modules, and Lessons created.');

  // 7. Create Batch
  const batch = await prisma.batch.create({
    data: {
      name: 'Full Stack Web Development - Batch A',
      code: 'FS-A-2026',
      collegeId: college.id,
      courseId: course.id,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31'),
      mode: 'HYBRID',
      scheduleDays: ['Monday', 'Wednesday', 'Friday'],
      scheduleTime: '10:00 AM - 12:00 PM',
      capacity: 60,
      status: 'UPCOMING',
      createdBy: superAdmin.id,
    },
  });

  // Link Trainer to Batch
  await prisma.batchTrainer.create({
    data: {
      batchId: batch.id,
      trainerId: trainerProfile.id,
      isPrimary: true,
    },
  });

  // Link Student to Batch
  await prisma.batchStudent.create({
    data: {
      batchId: batch.id,
      studentId: studentProfile.id,
      status: 'ACTIVE',
    },
  });

  console.log('Batch created with Trainer and Student associations.');
  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
