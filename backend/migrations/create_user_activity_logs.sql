-- Migration: Create user_activity_logs table
-- Run this SQL in your Supabase SQL editor

-- Drop if you need to re-create cleanly
-- DROP TABLE IF EXISTS public.user_activity_logs;

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id          text PRIMARY KEY,
  user_id     text NOT NULL,
  action_type text NOT NULL,
  resource_id text,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id
    ON public.user_activity_logs (user_id);

-- Index for time-based sorting
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at
    ON public.user_activity_logs (created_at DESC);

-- Index for filtering by action type
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action_type
    ON public.user_activity_logs (action_type);

-- Disable RLS (consistent with all other tables in this project)
ALTER TABLE public.user_activity_logs DISABLE ROW LEVEL SECURITY;
