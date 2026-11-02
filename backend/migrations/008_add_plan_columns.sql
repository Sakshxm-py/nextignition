-- Migration: 008_add_plan_columns.sql
-- Purpose: Add the top-level per-role plan columns that the codebase has always
--          assumed exist (founder_plan / expert_plan / investor_plan) but that
--          were never actually created. Then backfill them from two sources:
--            1. the existing data JSONB entitlement (data->>'<role>_plan')
--            2. the subscriptions table (active, non-expired paid subscriptions)
--
--          This is the root-cause fix for "elite members can't access elite
--          features": writes that referenced these non-existent columns silently
--          failed, and reads fell back to 'free'. Creating + backfilling the
--          columns makes every existing read/write path correct, and repairs the
--          entitlement for everyone who already paid.
-- Created: 2026-06-07
-- Safe to re-run (idempotent): uses IF NOT EXISTS and COALESCE-based backfill.

-- 1. Add the columns (default 'free').
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS founder_plan  text NOT NULL DEFAULT 'free';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expert_plan   text NOT NULL DEFAULT 'free';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS investor_plan text NOT NULL DEFAULT 'free';

-- 2. Backfill columns from the data JSONB entitlement, where present and valid.
UPDATE public.users
SET founder_plan = lower(data->>'founder_plan')
WHERE data->>'founder_plan' IN ('free', 'pro', 'elite')
  AND founder_plan IS DISTINCT FROM lower(data->>'founder_plan');

UPDATE public.users
SET expert_plan = lower(data->>'expert_plan')
WHERE data->>'expert_plan' IN ('free', 'pro', 'elite')
  AND expert_plan IS DISTINCT FROM lower(data->>'expert_plan');

UPDATE public.users
SET investor_plan = lower(data->>'investor_plan')
WHERE data->>'investor_plan' IN ('free', 'pro', 'elite')
  AND investor_plan IS DISTINCT FROM lower(data->>'investor_plan');

-- 3. Repair entitlements from the subscriptions table: anyone with an active,
--    non-expired paid subscription should have at least that tier. This recovers
--    users who paid but whose entitlement write previously failed.
--    (Wrapped in a guard so the migration still runs if the subscriptions table
--    is absent in a given environment.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    -- founder
    UPDATE public.users u
    SET founder_plan = s.plan
    FROM subscriptions s
    WHERE s.user_id = u.id
      AND s.role = 'founder'
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
      AND s.plan IN ('pro', 'elite')
      AND u.founder_plan = 'free';

    -- expert
    UPDATE public.users u
    SET expert_plan = s.plan
    FROM subscriptions s
    WHERE s.user_id = u.id
      AND s.role = 'expert'
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
      AND s.plan IN ('pro', 'elite')
      AND u.expert_plan = 'free';

    -- investor
    UPDATE public.users u
    SET investor_plan = s.plan
    FROM subscriptions s
    WHERE s.user_id = u.id
      AND s.role = 'investor'
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
      AND s.plan IN ('pro', 'elite')
      AND u.investor_plan = 'free';
  END IF;
END $$;

-- 4. Mirror the repaired columns back into the data JSONB so both sources of
--    truth agree (frontend reads either, depending on path).
UPDATE public.users
SET data = jsonb_set(
             jsonb_set(
               jsonb_set(COALESCE(data, '{}'::jsonb), '{founder_plan}',  to_jsonb(founder_plan),  true),
               '{expert_plan}',   to_jsonb(expert_plan),   true),
             '{investor_plan}', to_jsonb(investor_plan), true)
WHERE data->>'founder_plan'  IS DISTINCT FROM founder_plan
   OR data->>'expert_plan'   IS DISTINCT FROM expert_plan
   OR data->>'investor_plan' IS DISTINCT FROM investor_plan;

-- 5. Indexes for the fast-lookup reads (requireFeature, dashboards).
CREATE INDEX IF NOT EXISTS idx_users_founder_plan  ON public.users (founder_plan);
CREATE INDEX IF NOT EXISTS idx_users_expert_plan   ON public.users (expert_plan);
CREATE INDEX IF NOT EXISTS idx_users_investor_plan ON public.users (investor_plan);

DO $$
BEGIN
  RAISE NOTICE 'Plan columns added and backfilled at %', NOW();
  RAISE NOTICE 'elite founders: %, elite experts: %, elite investors: %',
    (SELECT count(*) FROM public.users WHERE founder_plan  = 'elite'),
    (SELECT count(*) FROM public.users WHERE expert_plan   = 'elite'),
    (SELECT count(*) FROM public.users WHERE investor_plan = 'elite');
END $$;
