# KodetoCareer — Training & Placement Management Platform

KodetoCareer is a unified SaaS **Training & Placement Operating System** designed for tier-2 and tier-3 engineering colleges in India. It bridges the gap between students, educators, partner colleges, and recruiters by combining a Learning Management System (LMS), Enterprise Resource Planning (ERP), and a Placement CRM.

---

## 👑 Platform Actors & Roles

| Role | Interface | Key Responsibilities |
| :--- | :--- | :--- |
| **Super Admin** | Web Dashboard | Master control over partner colleges, courses, trainers, batches, certificates, job boards, and platform analytics. |
| **College Admin** | Web Dashboard | Read-only access scoped to their college's active batches, student attendance rates, LMS course progress, and placement audits. |
| **Trainer** | Web Dashboard | Schedule class sessions, mark daily attendance logs, publish quizzes/assignments, and grade submissions. |
| **Student** | Flutter Mobile App | Access curriculum lessons (video, PDF, text), take timed quizzes, submit assignments, track placement readiness, and apply to job postings. |

---

## 🛠️ Technology Stack (Permanently Free Tier — v2)

The system is architected to support 0 to 10,000 active students at **₹0/month** infrastructure cost by using permanent free-tier services.

### 1. Backend API (Express.js Monolith)
*   **Runtime & Language**: Node.js (v20 LTS) + TypeScript (Strict Mode)
*   **Framework**: Express.js (Modular Monolith)
*   **ORM**: Prisma 5.x + serverless pooling
*   **Database**: Neon.tech (Serverless PostgreSQL 15)
*   **Cache & Queue**: Upstash Redis + BullMQ (with synchronous fallback if offline)
*   **Auth**: RS256 JWT (Access Token 15m, Refresh Token Rotation 30d) + Zod validations
*   **File Storage**: Cloudflare R2 (S3-compatible API, 10GB free)
*   **Email Gateway**: Resend SDK (3,000 free emails/month)
*   **Logger**: Winston structured logging

### 2. Frontend Web (Vite + React)
*   **Framework**: React 19 + Vite 8.0 + TypeScript
*   **Styling**: Tailwind CSS v3 + CSS Variables + Glassmorphism
*   **Icons**: Lucide React
*   **State Store**: Zustand
*   **Networking**: Axios (with automatic 401 transparent token rotation interceptors)
*   **Data Fetching**: TanStack React Query v5
*   **Charts**: Recharts (gradient visualizers)

### 3. Infrastructure & Services
*   **Host Server**: Oracle Cloud Always Free (4 OCPUs, 24GB RAM, 200GB disk)
*   **CDN & DNS**: Cloudflare Free Tier (Unlimited egress, SSL, rate limiting)
*   **Push Notifications**: Firebase Cloud Messaging (FCM)
*   **Status monitor**: UptimeRobot (50 monitors free)

---

## 🚀 Completed Work (Phases 1 - 3)

### Phase 1: Database & Authentication Foundation
*   **Supabase Database Connection**: Migration rules configured to target Neon/Supabase cloud pooling.
*   **Prisma Relational Schema**: 25+ tables spanning organization, LMS, assessments, organizational hierarchies, organization tracking, notifications, and logs.
*   **Secure Auth Engine**:
    *   RS256 Private/Public key encryption keys.
    *   Transparent token rotation handling.
    *   OTP verification codes for email registration and password resets.

### Phase 2: Backend Modules & Business Services
*   **CRUD Services**: Scoped endpoints for colleges, batches, courses, trainers, and student accounts.
*   **Bulk Student Import**: Custom CSV parser with row-level validation.
*   **Attendance Matrix**: Grid generator yielding session logs and automatic attendance percentages.
*   **Background Jobs Queue**: BullMQ integration with a synchronous fallback mechanism allowing background mailers to run even when local Redis cache is offline.
*   **Assignment Grading Suite**: Endpoints for uploading submissions, scoring, and writing feedback comments.

### Phase 3: React Web Admin Dashboard (Logo-Themed)
*   **UI Implementation**: Themed with the logo's electric blue/cyan color palette (`#00d2ff`, `#0072ff`, `#1E3A8A`) and deep-space dark backdrops (`#050811`, `#090d16`).
*   **Page Elements**:
    *   `Dashboard`: Graphical Recharts analytics (placements, attendance rates, registration counts).
    *   `Colleges`: CRUD control, active batch sizes, and Institution details.
    *   `Students`: CSV bulk importer dialog and user grid.
    *   `Trainers`: Biography details and specialization updating.
    *   `Courses`: Expandable Course -> Module -> Lesson syllabus workspace.
    *   `Batches`: Cohort scheduler with virtual meeting links and trainer allocation.
    *   `Placements`: Employment tracking and offer verification logs.
    *   `Jobs`: Job listing board posting and editing.
    *   `Communication`: Scoped push notifier and broad announcer.
    *   `Reports`: Trackers for attendance audits and academic syllabus completion rates.
    *   `Trainer Portal`: Session creator, student presence markers, and grading evaluator.

---

## 📋 Remaining Platform Roadmap (Phases 4 - 7)

### Phase 4: Flutter Mobile Client (Student Learning Portal)
*   **Scaffold & Routing**: Initialize Flutter workspace under `/mobile` using Riverpod 2.x state management, GoRouter, and Dio client.
*   **Authentication Flow**:
    *   Mobile onboarding screens, studentCode validation, OTP email input.
    *   Mandatory profile completion wizard on first login (avatar uploading, CGPA, graduation year, resume links).
*   **Learn Hub**:
    *   Syllabus list showing Course -> Module hierarchy with progress indicators.
    *   Lesson Player supporting sequential unlocks:
        *   Direct video player (Chewie) with playback watch time logs.
        *   PDF viewer (PDF notes from R2).
        *   Personal lesson note notepad.
*   **Assessments Engine**:
    *   Quiz taker with 30s auto-saves, countdown timers, and warning alerts.
    *   Quiz leaderboards showing top 10 fastest and highest scorers.
    *   Assignment submissions: picking files, uploading to Cloudflare R2, and viewing grader comments.

### Phase 5: Video Delivery & Offline Mobile Sync
*   **Cloudflare R2 CDN Streaming**: Optimize direct MP4 playback from Cloudflare storage.
*   **Watch-Time Persistence**: Resume video playback from last watched timestamp across sessions.
*   **SQLite Offline Database**:
    *   Sync SQLite (`sqflite`) for mobile.
    *   Permit offline viewing of syllabus notes, course slides, and already watched lesson materials.
    *   Store completed quiz answers offline and sync to server once internet is restored.

### Phase 6: Automated Certifications Engine
*   **Eligibility Check**: Automatically trigger certification verification when a student reaches $\ge 75\%$ attendance, $\ge 60\%$ quiz average, and grades all mandatory assignments.
*   **PDFKit Generator**: Compile high-resolution Landscape completion certificates with unique hash codes and secure QR verification links.
*   **Public Verification**: Add a landing page `/verify/:code` allowing recruiters to verify certificate validity.
*   **Sharing API**: Enable single-click WhatsApp share cards and LinkedIn Certification Upload integrations.

### Phase 7: Placement CRM & Recruiter Portal
*   **Placement Readiness Score**: Implement a weighted composite algorithm (composite 0–100) scoring students based on CGPA, attendance rates, quiz percentages, and completed lessons.
*   **CRM Recruiter Portal**:
    *   Recruiter profile management.
    *   Search and filter students by skills, CGPA, and readiness score.
    *   Direct student resume downloading (bulk resume export).
*   **Student Job Board**:
    *   Apply/Express Interest click tracker.
    *   Recruiter application tracker (Applied -> Shortlisted -> Hired / Rejected).

---

## ⚡ Running Locally

### Prerequisites
*   Node.js (v20+)
*   npm or yarn
*   PostgreSQL instance (Supabase/Neon connection URL)

### 1. Backend Server Setup
```bash
cd backend
npm install
# Copy environment template and fill variables (.env)
cp .env.example .env
# Run Prisma migrations
npx prisma migrate dev
# Seed default users & databases
npm run prisma:seed
# Start the dev server on port 3000
npm run dev
```

### 2. Frontend React Web Dashboard Setup
```bash
cd frontend
npm install
# Start Vite local development server on port 5173
npm run dev
```

### 🔐 Seeded Login Credentials
Use the password **`Password123!`** to test the web portal components:
*   👑 **Super Admin**: `superadmin@kodetocareer.com`
*   🏛️ **College Admin**: `collegeadmin@kodetocareer.com`
*   🧑‍🏫 **Trainer**: `trainer@kodetocareer.com`
*   🎓 **Student**: `student@kodetocareer.com`
