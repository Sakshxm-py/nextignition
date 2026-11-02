-- ============================================================
-- NextIgnition — Consolidated Pending Migrations
-- Run this entire file once in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/btxdxwyvloucxdfjlfhb/sql
-- ============================================================

-- -------------------------------------------------------
-- 1. public_leads
-- Stores unauthenticated visitor registrations from /register
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_leads_email  ON public.public_leads (email);
CREATE INDEX IF NOT EXISTS idx_public_leads_role   ON public.public_leads USING GIN ((data->'role'));
CREATE INDEX IF NOT EXISTS idx_public_leads_status ON public.public_leads USING GIN ((data->'status'));

-- -------------------------------------------------------
-- 2. admin_users
-- Stores admin accounts with RBAC roles
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL CHECK (role IN ('PRIMARY_ADMIN', 'SECONDARY_ADMIN')),
  status        VARCHAR(50)  NOT NULL CHECK (status IN ('active', 'suspended')) DEFAULT 'active',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  last_login    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email  ON public.admin_users (email);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON public.admin_users (status);

-- -------------------------------------------------------
-- 3. admin_logs  (audit trail — matches adminLogger.ts)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  module         VARCHAR(100) NOT NULL,
  action         VARCHAR(100) NOT NULL,
  target_id      VARCHAR(500),
  change_summary JSONB,
  ip_address     VARCHAR(50),
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id  ON public.admin_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_module    ON public.admin_logs (module);
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON public.admin_logs (timestamp DESC);

-- -------------------------------------------------------
-- 4. reports  (content moderation reports)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  TEXT NOT NULL,
  content_id   TEXT NOT NULL,
  content_type TEXT NOT NULL,  -- 'post', 'comment', 'message'
  reason       TEXT NOT NULL,
  details      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'resolved', 'dismissed'
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID REFERENCES public.admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_status     ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter   ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports (created_at DESC);

-- -------------------------------------------------------
-- 5. platform_settings  (global app configuration)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id         VARCHAR(50) PRIMARY KEY DEFAULT 'global',
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL
);

-- Seed default settings if not already present
INSERT INTO public.platform_settings (id, data)
VALUES (
  'global',
  '{"maintenanceMode": false, "allowRegistration": true, "useGPT4": false, "dailyLimit": 10, "temperature": 0.7, "supportEmail": "support@nextignition.io"}'
)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- 6. community_members  (community membership records)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_members (
  id           TEXT PRIMARY KEY,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_members_community ON public.community_members USING GIN ((data->'communityId'));
CREATE INDEX IF NOT EXISTS idx_community_members_user      ON public.community_members USING GIN ((data->'userId'));

-- -------------------------------------------------------
-- 7. investments  (investment tracking)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.investments (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investments_startup  ON public.investments USING GIN ((data->'startupId'));
CREATE INDEX IF NOT EXISTS idx_investments_investor ON public.investments USING GIN ((data->'investorId'));

-- -------------------------------------------------------
-- RLS: Disable for service-role-only admin tables
-- (Public tables are already configured via schema)
-- -------------------------------------------------------
ALTER TABLE public.admin_users    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_leads   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments    DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- DONE — All 7 missing tables are now created.
-- After running, re-run: node backend/scratch/check_supabase_schema.js
-- to verify everything is green.
-- ============================================================
