-- Migration: 010_reconcile_admin_users_id_type.sql
-- Purpose: Resolve the admin_users id-type drift. admin_users was defined three
--          times with two different id types:
--            - supabase_schema.sql : id VARCHAR  (text)   ← app convention
--            - migrations/003, 005 : id UUID
--          Every other table in the app uses app-generated text ids, and
--          supabase_schema.sql (the canonical fresh-setup file) already uses
--          VARCHAR here, so the canonical type is TEXT. This migration normalizes
--          admin_users.id and every column that references it to text, on any
--          live DB regardless of which definition created it.
--
-- Referencing columns handled: admin_logs.admin_id, platform_settings.updated_by,
-- reports.resolved_by, and the admin_users self-refs created_by / updated_by.
--
-- Created: 2026-06-07
-- Run AFTER 009. Idempotent and safe to re-run. Converting uuid -> text is always
-- lossless; text -> text is a no-op. FKs are restored as NOT VALID so the step
-- can never fail on pre-existing orphaned rows while still enforcing new writes.

DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.admin_users') IS NULL THEN
    RAISE NOTICE 'admin_users does not exist; nothing to reconcile.';
    RETURN;
  END IF;

  -- ── 1. Drop every FK that references admin_users(id) (inbound + self-refs).
  FOR r IN
    SELECT conrelid::regclass::text AS tbl, conname
    FROM pg_constraint
    WHERE confrelid = 'public.admin_users'::regclass AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;

  -- ── 2. Normalize admin_users.id (PK) and its self-ref columns to text.
  EXECUTE 'ALTER TABLE public.admin_users ALTER COLUMN id TYPE text USING id::text';
  EXECUTE 'ALTER TABLE public.admin_users ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='admin_users' AND column_name='created_by') THEN
    EXECUTE 'ALTER TABLE public.admin_users ALTER COLUMN created_by TYPE text USING created_by::text';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='admin_users' AND column_name='updated_by') THEN
    EXECUTE 'ALTER TABLE public.admin_users ALTER COLUMN updated_by TYPE text USING updated_by::text';
  END IF;

  -- ── 3. Normalize referencing columns in other tables to text.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='admin_logs' AND column_name='admin_id') THEN
    EXECUTE 'ALTER TABLE public.admin_logs ALTER COLUMN admin_id TYPE text USING admin_id::text';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='platform_settings' AND column_name='updated_by') THEN
    EXECUTE 'ALTER TABLE public.platform_settings ALTER COLUMN updated_by TYPE text USING updated_by::text';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='reports' AND column_name='resolved_by') THEN
    EXECUTE 'ALTER TABLE public.reports ALTER COLUMN resolved_by TYPE text USING resolved_by::text';
  END IF;

  -- ── 4. Restore FKs (text -> text), nullable, ON DELETE SET NULL, NOT VALID so
  --       existing orphaned rows cannot block the migration.
  -- self-refs
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='admin_users' AND column_name='created_by') THEN
    ALTER TABLE public.admin_users
      ADD CONSTRAINT admin_users_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='admin_users' AND column_name='updated_by') THEN
    ALTER TABLE public.admin_users
      ADD CONSTRAINT admin_users_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES public.admin_users(id) ON DELETE SET NULL NOT VALID;
  END IF;
  -- inbound refs
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='admin_logs' AND column_name='admin_id') THEN
    ALTER TABLE public.admin_logs
      ADD CONSTRAINT admin_logs_admin_id_fkey
      FOREIGN KEY (admin_id) REFERENCES public.admin_users(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='platform_settings' AND column_name='updated_by') THEN
    ALTER TABLE public.platform_settings
      ADD CONSTRAINT platform_settings_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES public.admin_users(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='reports' AND column_name='resolved_by') THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_resolved_by_fkey
      FOREIGN KEY (resolved_by) REFERENCES public.admin_users(id) ON DELETE SET NULL NOT VALID;
  END IF;

  RAISE NOTICE 'admin_users id-type reconciliation completed; all refs normalized to text.';
END $$;
