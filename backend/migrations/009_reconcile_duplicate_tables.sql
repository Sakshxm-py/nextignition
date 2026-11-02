-- Migration: 009_reconcile_duplicate_tables.sql
-- Purpose: Collapse tables that were defined more than once for the same feature
--          so the live DB has exactly one canonical table per feature, matching
--          the code. Two features are reconciled here:
--
--   1. saved_items   — defined twice in supabase_schema.sql with different shapes
--                      (uuid PK / no unique vs bigserial PK / unique constraint).
--                      Canonical = a single saved_items with a UNIQUE
--                      (user_id, item_id, item_type). Code: bookmarkController,
--                      feedController, aiController, adminController.
--
--   2. admin_logs    — the audit-trail table the code actually uses
--                      (utils/adminLogger.ts). admin_activity_logs (migration 003)
--                      is a never-referenced duplicate of the same feature, and
--                      the supabase_schema.sql copy of admin_logs is missing the
--                      change_summary / ip_address columns the code writes.
--
-- Created: 2026-06-07
-- Idempotent and safe to re-run. The only destructive step (dropping
-- admin_activity_logs) copies its rows into admin_logs first and is skipped if
-- the copy fails.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. saved_items: enforce a single canonical shape.
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure the columns the code relies on have the expected defaults.
ALTER TABLE public.saved_items ALTER COLUMN item_type SET DEFAULT 'post';

-- Remove duplicate (user_id, item_id, item_type) rows, keeping one of each,
-- so the UNIQUE index below can be created.
DELETE FROM public.saved_items a
USING public.saved_items b
WHERE a.ctid < b.ctid
  AND a.user_id   = b.user_id
  AND a.item_id   = b.item_id
  AND a.item_type = b.item_type;

-- One row per (user, item, type). Idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS saved_items_user_item_type_uniq
  ON public.saved_items (user_id, item_id, item_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. admin_logs: make the canonical audit table match the code, then absorb and
--    drop the duplicate admin_activity_logs.
-- ─────────────────────────────────────────────────────────────────────────────

-- Backfill the columns adminLogger.ts writes but that the schema.sql definition
-- of admin_logs omitted. No-ops if migration 005 already added them.
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS change_summary JSONB;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS ip_address     VARCHAR(50);

-- adminLogger.ts logs admin_id = NULL for the env-based PRIMARY_ADMIN, but the
-- schema.sql definition declared admin_id NOT NULL, which silently rejected those
-- inserts. Make it nullable to match the code. No-op if already nullable.
ALTER TABLE public.admin_logs ALTER COLUMN admin_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id  ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_module    ON public.admin_logs(module);
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON public.admin_logs(timestamp DESC);

-- Absorb admin_activity_logs (the unused duplicate) into admin_logs, then drop it.
-- Wrapped so a column/type mismatch leaves the table in place rather than aborting.
DO $$
DECLARE
  cnt int;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admin_activity_logs'
  ) THEN
    SELECT count(*) INTO cnt FROM public.admin_activity_logs;

    IF cnt = 0 THEN
      DROP TABLE public.admin_activity_logs;
      RAISE NOTICE 'admin_activity_logs was empty — dropped.';
    ELSE
      BEGIN
        -- id omitted on purpose: let admin_logs generate its own (the two tables
        -- may use different id/admin_id types). target_type is dropped (not part
        -- of admin_logs and unused by code).
        INSERT INTO public.admin_logs
          (admin_id, module, action, target_id, change_summary, ip_address, timestamp)
        SELECT
          admin_id, module, action, target_id, change_summary, ip_address, timestamp
        FROM public.admin_activity_logs;

        DROP TABLE public.admin_activity_logs;
        RAISE NOTICE 'Migrated % row(s) from admin_activity_logs into admin_logs and dropped it.', cnt;
      EXCEPTION WHEN others THEN
        RAISE WARNING 'Could not auto-migrate admin_activity_logs (%). Left in place — migrate manually, then DROP TABLE admin_activity_logs.', SQLERRM;
      END;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Duplicate-table reconciliation completed at %', NOW();
END $$;
