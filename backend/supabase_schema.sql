create extension if not exists "uuid-ossp";

create table if not exists public.availabilities (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.bookings (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.channels (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.cofounder_profiles (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.cofounder_saves (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.communities (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.community_invites (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.community_messages (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.conversations (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.deal_rooms (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.deal_room_documents (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.direct_messages (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.document_analyses (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.events (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.follows (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.funding_applications (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.funding_bookmarks (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.funding_interests (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.messages (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.news_articles (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.notifications (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.payments (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.pitch_deck_analyses (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.podcast_episodes (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.posts (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.startups (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.users (
  id text primary key,
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.knowledge_content (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.specific_availabilities (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.saved_items (
  id bigserial primary key,
  user_id text not null,
  item_id text not null,
  item_type text not null default 'post',
  created_at timestamptz default now(),
  unique (user_id, item_id, item_type)
);

create table if not exists public.stories (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.availabilities disable row level security;
alter table public.bookings disable row level security;
alter table public.channels disable row level security;
alter table public.cofounder_profiles disable row level security;
alter table public.cofounder_saves disable row level security;
alter table public.communities disable row level security;
alter table public.community_invites disable row level security;
alter table public.community_messages disable row level security;
alter table public.conversations disable row level security;
alter table public.deal_rooms disable row level security;
alter table public.deal_room_documents disable row level security;
alter table public.direct_messages disable row level security;
alter table public.document_analyses disable row level security;
alter table public.events disable row level security;
alter table public.follows disable row level security;
alter table public.funding_applications disable row level security;
alter table public.funding_bookmarks disable row level security;
alter table public.funding_interests disable row level security;
alter table public.messages disable row level security;
alter table public.news_articles disable row level security;
alter table public.notifications disable row level security;
alter table public.payments disable row level security;
alter table public.pitch_deck_analyses disable row level security;
alter table public.podcast_episodes disable row level security;
alter table public.posts disable row level security;
alter table public.saved_items disable row level security;
alter table public.startups disable row level security;
alter table public.users disable row level security;
alter table public.knowledge_content disable row level security;
alter table public.specific_availabilities disable row level security;
alter table public.stories disable row level security;
alter table public.saved_items disable row level security;

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Avatars, cover photos and event images are uploaded here; the app serves them
-- via /storage/v1/object/public/profile-pics/... so the bucket MUST be public,
-- otherwise every profile picture URL 400s and images don't load anywhere.
insert into storage.buckets (id, name, public)
values ('profile-pics', 'profile-pics', true)
on conflict (id) do update set public = true;

CREATE TABLE IF NOT EXISTS public.admin_users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'SECONDARY_ADMIN',
  status VARCHAR NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  admin_id VARCHAR REFERENCES public.admin_users(id) ON DELETE SET NULL,
  action VARCHAR NOT NULL,
  module VARCHAR NOT NULL,
  target_id VARCHAR,
  change_summary JSONB,
  ip_address VARCHAR(50),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

alter table public.admin_users disable row level security;
alter table public.admin_logs disable row level security;

CREATE TABLE IF NOT EXISTS public.reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  reporter_id VARCHAR NOT NULL,
  content_id VARCHAR NOT NULL,
  content_type VARCHAR NOT NULL, -- 'post', 'comment', 'message'
  reason VARCHAR NOT NULL,
  details TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR REFERENCES public.admin_users(id)
);

alter table public.reports disable row level security;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id VARCHAR PRIMARY KEY DEFAULT 'global',
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_by VARCHAR REFERENCES public.admin_users(id)
);

alter table public.platform_settings disable row level security;
