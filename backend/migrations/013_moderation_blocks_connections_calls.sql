-- Migration: 013_moderation_blocks_connections_calls.sql
-- Purpose: Add backing tables for actions that previously had no backend:
--            1. reports               — user/content reporting (Report Profile)
--            2. user_blocks           — blocking a user (Block User, chat ⋮ → Block)
--            3. cofounder_connections — co-founder "Connect" requests
--            4. call_logs             — voice/video call initiation + status
--
--          All four follow the canonical generic shape used across this schema
--          (id text PK + jsonb data + timestamps). Idempotent and safe to re-run.
--
-- Created: 2026-06-09

-- NOTE: `reports` may ALREADY exist with a typed-column shape (see supabase_schema.sql:
--       reporter_id/content_id/content_type/reason/status ... all NOT NULL), which the
--       admin moderation panel (adminController.getReports/resolveReport) relies on.
--       reportController.ts instead uses the generic {id, data jsonb} shape. To support
--       BOTH without data loss, we make the table a superset: ensure the generic columns
--       exist and relax the old NOT NULLs so generic inserts ({id, data, created_at}) work.
create table if not exists public.reports (
  id text primary key,
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz
);
-- If the typed version pre-existed, add the generic columns it lacks.
alter table public.reports add column if not exists data jsonb;
alter table public.reports add column if not exists created_at timestamptz default now();
alter table public.reports add column if not exists updated_at timestamptz;
-- If the GENERIC version pre-existed (fresh DB), add the typed columns the admin
-- moderation panel + reportController.createReport populate. Keeps the table a true
-- superset regardless of which shape existed first.
alter table public.reports add column if not exists reporter_id  text;
alter table public.reports add column if not exists content_id   text;
alter table public.reports add column if not exists content_type text;
alter table public.reports add column if not exists reason       text;
alter table public.reports add column if not exists details      text;
alter table public.reports add column if not exists status       text default 'pending';
alter table public.reports add column if not exists resolved_at  timestamptz;
alter table public.reports add column if not exists resolved_by  text;
-- Relax legacy NOT NULL constraints so generic inserts don't fail (only if the columns exist).
do $$
declare col text;
begin
  foreach col in array array['reporter_id','content_id','content_type','reason'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'reports' and column_name = col
    ) then
      execute format('alter table public.reports alter column %I drop not null', col);
    end if;
  end loop;
end $$;

create table if not exists public.user_blocks (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create table if not exists public.cofounder_connections (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create table if not exists public.call_logs (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- Lookup indexes for the access patterns the controllers use.
create index if not exists reports_reporter_idx        on public.reports        ((data->>'reporter'));
create index if not exists reports_status_idx          on public.reports        ((data->>'status'));
create index if not exists user_blocks_blocker_idx     on public.user_blocks    ((data->>'blocker'));
create index if not exists user_blocks_blocked_idx     on public.user_blocks    ((data->>'blocked'));
create index if not exists cofounder_conn_to_idx       on public.cofounder_connections ((data->>'to'));
create index if not exists cofounder_conn_from_idx     on public.cofounder_connections ((data->>'from'));
create index if not exists call_logs_to_idx            on public.call_logs      ((data->>'to'));
create index if not exists call_logs_from_idx          on public.call_logs      ((data->>'from'));
