# NextIgnition — Vulnerabilities & Bugs Audit Report

This document reports all security vulnerabilities, software bugs, database structure inconsistencies, and demo data remnants found during a comprehensive audit of the NextIgnition codebase and live Supabase database environment on **May 21, 2026**.

---

## 🛡️ Security Vulnerabilities

### 1. Row-Level Security (RLS) Disabled (Severity: 🔴 CATASTROPHIC)
* **Location:** Database Schema (`backend/supabase_schema.sql` / Live Database)
* **Description:** Almost all primary public database tables (including `users`, `posts`, `startups`, `communities`, `availabilities`, `bookings`, `saved_items`, `cofounder_profiles`) have Row-Level Security explicitly disabled via the following commands:
  ```sql
  alter table public.users disable row level security;
  alter table public.posts disable row level security;
  alter table public.startups disable row level security;
  ```
* **Impact:** Because Supabase relies on client-side direct API routing, if an anonymous key (`anon`) is exposed in the frontend client, any malicious actor or user can open a browser console and read, write, modify, or delete any record in these tables without authentication.
* **Remediation:** 
  1. Enable RLS on all tables: `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;`
  2. Implement proper Supabase policies using `auth.uid()` checks to restrict read/write access to matching users only.

### 2. Insecure Default JWT Secrets (Severity: 🟡 MEDIUM)
* **Location:** `.env` / `.env.example` (`JWT_SECRET`, `ADMIN_JWT_SECRET`)
* **Description:** The default JWT secret keys used for user authentication and admin authentication are hardcoded as `supersecretkey123` and `superadminsecretkey123`.
* **Impact:** If these default credentials are not changed in a production environment, attackers can easily forge valid administrator or founder JWT tokens to gain unauthorized access to all user profiles, payments, and admin endpoints.
* **Remediation:** Force environment configuration audits. Ensure that production `.env` setups generate a cryptographically secure random secret (e.g. 64-character hex strings) using `openssl rand -hex 32`.

---

## 🐛 Database & Codebase Bugs

### 3. Missing Database Tables (Severity: 🔴 CRITICAL)
* **Location:** Live Supabase Schema
* **Description:** Several critical database tables referenced in the codebase are missing entirely from the live Supabase instance:
  - `admin_users`
  - `admin_logs`
  - `reports`
  - `platform_settings`
  - `public_leads`
  - `community_members`
  - `investments`
* **Impact:** 
  - All administrator endpoints (login, dashboard stats, transaction viewing, role application reviews) fail with SQL errors since `admin_users` does not exist in the database.
  - The support tickets, content reports, and public landing page registration leads system are entirely inoperable.
  - Channels and communities membership checks crash or behave unexpectedly.
* **Remediation:** Write and run an automated script (`execute_migrations.js`) utilizing the database's PG RPC connection to apply all outstanding SQL migrations from the `backend/migrations` folder.

### 4. Database Table Name Mismatch (Severity: 🟠 HIGH)
* **Location:** `backend/migrations/003_admin_access_control.sql` vs. `backend/src/utils/adminLogger.ts`
* **Description:** There is a naming collision between database migration scripts and the application code:
  - The migration script `003_admin_access_control.sql` creates a table called `admin_activity_logs`.
  - The actual TypeScript logging utility `adminLogger.ts` queries a table called `admin_logs`.
  - The `005_admin_full_system.sql` migration later creates `admin_logs` instead of `admin_activity_logs`.
* **Impact:** Any attempt to read or write audit logs causes SQL errors (e.g., table not found or relation does not exist) because the code and migrations target different table names.
* **Remediation:** Align all schemas and codebase queries to use the unified `admin_logs` table structure to ensure that the audit logging operates cleanly.

---

## 🗄️ Demo/Mock Data Remnants

### 5. Active Test Accounts in Live Database (Severity: 🟡 MEDIUM)
* **Location:** `users` Table (Live Database)
* **Description:** There are **13 active test or demo user accounts** stored in the live database:
  - `testfounder@example.com` (Test Founder)
  - `investor@test.com` (Test Investor)
  - `test_verify@example.com` (Test Verify User)
  - `testh@gmail.com` (Yest)
  - `fixverify123@example.com` (Fix Verify)
  - `testinvestor123@example.com` (Test Investor)
  - `founder_test@example.com` (Test Founder)
  - `founder@test.com` (Test Founder)
  - `expert@test.com` (Expert User)
  - `founder@example.com` (founder)
  - `final_test_1775218662209@example.com` (Final Test User)
  - `test@example.com` (Test User)
  - `testuser@gmail.com` (Test user)
* **Impact:** Leads to incorrect statistics on active production platforms, and poses a minor risk of leakage of mock details.
* **Remediation:** Execute a target cleanup script (`purge_demo_users.js`) to purge all mock accounts matching these IDs, domains, or names from the production instance.

---

### Conclusion & Plan of Action
We are executing a multi-step database correction process:
1. **Apply Migrations:** Run a automated SQL applicator to initialize `admin_users`, `admin_logs`, `platform_settings`, `reports`, and `public_leads`.
2. **Purge Demo Data:** Run a targeting deletion query for all test users and associated nodes.
3. **Verify:** Confirm the database is clean and fully operational.
