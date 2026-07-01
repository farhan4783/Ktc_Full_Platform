# Connecting KodetoCareer Backend to Supabase

This document outlines the step-by-step instructions to connect your backend API to your Supabase PostgreSQL instance, run migrations, and seed sample data.

---

## 💡 Connecting Now vs. After Phase 2

It is **highly recommended to connect to Supabase now (in Phase 1)** rather than waiting until after Phase 2. Connecting now guarantees:
1. **Schema Validation**: Validates that all 25+ tables, relationships, and indexes are created successfully on a live PostgreSQL database.
2. **Data Seeding**: Populates your database with test users (Super Admin, College Admin, Trainer, Student) and course structures using the seed script.
3. **API Integrity**: Allows us to run the server locally and verify that authentication endpoints (register, verify-email, login, etc.) work correctly.
4. **Easier Debugging**: If you wait until after Phase 2 (building the React Admin Panel), debugging database issues alongside frontend integration issues becomes significantly harder.

---

## 🛠️ Step 1: Get the Connection Strings from Supabase

Prisma needs two connection strings to work optimally with Supabase:
1. **Transaction Pooler URL** (for database queries under serverless/concurrent conditions).
2. **Direct connection URL** (for running migrations).

Follow these steps in your Supabase dashboard:
1. Go to your **Supabase Dashboard** -> Select your project.
2. Click on the **Project Settings** (gear icon) in the sidebar -> Go to **Database**.
3. Under the **Connection string** section, select **URI**:
   - **Transaction Mode (Pooler)**: Copy this URI. It will look like:
     `postgres://postgres.[your-project-ref]:[your-password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
   - **Session Mode (Direct)**: Copy this URI (or use the one on port `5432`). It will look like:
     `postgres://postgres:[your-password]@db.[your-project-ref].supabase.co:5432/postgres`

---

## ⚙️ Step 2: Configure the `.env` File

Open your [`.env`](file:///c:/Users/FARAZ%20KHAN/Desktop/Work/ktcapp/backend/.env) file and update the database configuration:

1. Replace `DATABASE_URL` with your **Transaction Pooler URL** (remember to replace `[your-password]` with the password you set when creating the Supabase project).
2. Add a `DIRECT_URL` pointing to the **Direct connection URL** (port 5432).

Example configuration:
```env
# Database Connections
DATABASE_URL="postgres://postgres.abc123xyz:MySecurePassword@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres:MySecurePassword@db.abc123xyz.supabase.co:5432/postgres"
```

---

## 🔄 Step 3: Configure Prisma for Supabase Connection Pooler

Since Supabase uses a pooler, we must configure Prisma to use the `DIRECT_URL` specifically for running migrations (which don't work through a transaction pooler).

Open your [`schema.prisma`](file:///c:/Users/FARAZ%20KHAN/Desktop/Work/ktcapp/backend/prisma/schema.prisma) file and ensure the `datasource db` block looks like this (with `directUrl` included):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## 🚀 Step 4: Run Migrations and Seed Data

Once `.env` and `schema.prisma` are configured, run the following command in your terminal inside the `backend` folder:

```powershell
npx prisma migrate dev --name init
```

### What this command does:
1. Connects directly to Supabase via `DIRECT_URL`.
2. Creates the migrations table and applies the schema (generating all 25+ tables).
3. Generates the Prisma Client.
4. Triggers the seed script [`prisma/seed.ts`](file:///c:/Users/FARAZ%20KHAN/Desktop/Work/ktcapp/backend/prisma/seed.ts) to populate the database.

---

## 🟢 Step 5: Start the Server

Start your API server in development mode:
```powershell
npm run dev
```

You can now test the API health status by opening `http://localhost:3000/health` in your browser.




password for everylogin


Role / Actor	Email Address	Default Password
👑 Super Admin	-            superadmin@kodetocareer.com	      Password123!
🏛️ College Admin (Admin) - 	collegeadmin@kodetocareer.com	     Password123!
🧑‍🏫 Trainer  -              	trainer@kodetocareer.com	         Password123!
🎓 Student-                	student@kodetocareer.com	          Password123!

