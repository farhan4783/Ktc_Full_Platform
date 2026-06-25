# Guide: Setting up Local Native PostgreSQL on Windows

Since Docker is not available on your system, follow this guide to install and configure PostgreSQL natively as a local Windows service.

---

## 📥 Step 1: Download & Run Installer

1. Go to the [EnterpriseDB PostgreSQL Downloads Page](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
2. Download the installer for **PostgreSQL 15** (or v16) for **Windows x86-64**.
3. Launch the downloaded `.exe` installer.

---

## ⚙️ Step 2: Installation Configuration

During the installation wizard steps, use the following options:
1. **Installation Directory**: Keep default.
2. **Select Components**: Keep all checked (`PostgreSQL Server`, `pgAdmin 4`, `Stack Builder`, `Command Line Tools`).
3. **Password**: Enter `postgres` (or your preferred password). 
   > *Note: If you use a password other than `postgres`, make sure to update the password in your `backend/.env` file.*
4. **Port**: Keep the default `5432`.
5. **Advanced Options**: Keep default locale.
6. Click **Next** and complete the installation.

---

## 🗄️ Step 3: Create the Database

Once the installation is complete, you need to create the `kodetocareer` database.

### Option A: via pgAdmin 4 (GUI)
1. Open **pgAdmin 4** from your Windows Start Menu.
2. Expand **Servers** on the left browser panel, enter your superuser password (e.g. `postgres`).
3. Right-click on **Databases** -> **Create** -> **Database...**
4. Enter Database name: `kodetocareer`
5. Click **Save**.

### Option B: via Terminal/Command Prompt
1. Open Command Prompt or PowerShell.
2. Log in and create the database:
   ```bash
   psql -U postgres -c "CREATE DATABASE kodetocareer;"
   ```
3. Enter your password when prompted.

---

## ⚡ Step 4: Run Migrations and Seed Data

Once the local database `kodetocareer` is created:

1. Update your [backend/.env](file:///c:/Users/FARAZ%20KHAN/Desktop/Work/ktcapp/backend/.env) file database connection strings (pre-configured to `postgres:postgres@localhost:5432`).
2. Run Prisma migrations to push the database schema:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   ```
3. Seed the local database with default test accounts:
   ```bash
   npm run prisma:seed
   ```
4. Start your local server:
   ```bash
   npm run dev
   ```
