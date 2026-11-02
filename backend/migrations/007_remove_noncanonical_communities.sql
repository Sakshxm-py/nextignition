-- Migration: 007_remove_noncanonical_communities.sql
-- Purpose: Hard-delete every community that is NOT one of the five canonical
--          communities, plus all of its dependent data (channels, messages,
--          invites). This removes the leftover "Founder"/"Startup"/etc. rows so
--          the platform shows exactly the five intended communities.
-- Created: 2026-06-07
-- WARNING: This is a DESTRUCTIVE, irreversible operation. Back up the database
--          (communities, channels, community_messages, community_invites)
--          before running.
--
-- The canonical list below MUST stay in sync with CANONICAL_COMMUNITIES in
-- backend/src/controllers/communityController.ts.

WITH canonical AS (
  SELECT unnest(ARRAY[
    'Next Ignition Founder Lounge',
    'Startup Feedback & Validation',
    'Fundraising & Investor Talk',
    'Build & Growth',
    'Events, Podcasts & Opportunities'
  ]) AS name
),
-- Communities to remove = any whose name is not in the canonical set.
stray_community_ids AS (
  SELECT id
  FROM communities
  WHERE (data->>'name') IS NULL
     OR (data->>'name') NOT IN (SELECT name FROM canonical)
),
-- Channels belonging to those communities (channel.data->>'communityId').
stray_channel_ids AS (
  SELECT id
  FROM channels
  WHERE (data->>'communityId') IN (SELECT id FROM stray_community_ids)
)

-- Step 1: delete messages in the stray channels.
DELETE FROM community_messages
WHERE (data->>'channelId') IN (SELECT id FROM stray_channel_ids);

-- Step 2: delete the stray channels.
WITH canonical AS (
  SELECT unnest(ARRAY[
    'Next Ignition Founder Lounge',
    'Startup Feedback & Validation',
    'Fundraising & Investor Talk',
    'Build & Growth',
    'Events, Podcasts & Opportunities'
  ]) AS name
),
stray_community_ids AS (
  SELECT id FROM communities
  WHERE (data->>'name') IS NULL
     OR (data->>'name') NOT IN (SELECT name FROM canonical)
)
DELETE FROM channels
WHERE (data->>'communityId') IN (SELECT id FROM stray_community_ids);

-- Step 3: delete invites for the stray communities.
WITH canonical AS (
  SELECT unnest(ARRAY[
    'Next Ignition Founder Lounge',
    'Startup Feedback & Validation',
    'Fundraising & Investor Talk',
    'Build & Growth',
    'Events, Podcasts & Opportunities'
  ]) AS name
),
stray_community_ids AS (
  SELECT id FROM communities
  WHERE (data->>'name') IS NULL
     OR (data->>'name') NOT IN (SELECT name FROM canonical)
)
DELETE FROM community_invites
WHERE (data->>'communityId') IN (SELECT id FROM stray_community_ids);

-- Step 4: delete the stray communities themselves.
WITH canonical AS (
  SELECT unnest(ARRAY[
    'Next Ignition Founder Lounge',
    'Startup Feedback & Validation',
    'Fundraising & Investor Talk',
    'Build & Growth',
    'Events, Podcasts & Opportunities'
  ]) AS name
)
DELETE FROM communities
WHERE (data->>'name') IS NULL
   OR (data->>'name') NOT IN (SELECT name FROM canonical);

DO $$
BEGIN
  RAISE NOTICE 'Non-canonical communities cleanup completed at %', NOW();
  RAISE NOTICE 'Remaining communities: %', (SELECT count(*) FROM communities);
END $$;
