-- Migration: 014_engagement_events.sql
-- Purpose: Backing table for LinkedIn-style "account engagement" shown on every
--          role's dashboard (founder / expert / investor):
--            * profile views      ("who viewed your profile")
--            * post impressions   (your posts seen in feeds)
--            * search appearances (you showing up in discover/search results)
--          Follower growth is derived from the existing `follows` table.
--
--          Follows the canonical generic shape (id text PK + jsonb data + ts).
--          Each row is one unique (type, owner, actor, post, day) engagement so
--          re-inserts on the same day collide on the primary key (idempotent,
--          spam-resistant — counts unique daily actors).
--
--          data shape:
--            { type: 'profile_view' | 'post_impression' | 'search_appearance',
--              owner: <userId whose engagement this counts toward>,
--              actor: <userId who did the viewing>,
--              post:  <postId, only for post_impression>,
--              day:   'YYYY-MM-DD',
--              createdAt: ISO }
--
--          Idempotent and safe to re-run.
-- Created: 2026-06-21

create table if not exists public.engagement_events (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now()
);

-- Aggregation is always "events for owner X, optionally of type T, in a time window".
create index if not exists engagement_owner_idx        on public.engagement_events ((data->>'owner'));
create index if not exists engagement_owner_type_idx   on public.engagement_events ((data->>'owner'), (data->>'type'));
create index if not exists engagement_created_idx       on public.engagement_events (created_at);
