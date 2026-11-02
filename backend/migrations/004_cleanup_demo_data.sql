-- Migration: 004_cleanup_demo_data.sql
-- Purpose: Remove posts, demo startups, and demo communities
-- NOTE: ALL USERS ARE PRESERVED
-- Created: 2026-04-18
-- WARNING: This is a destructive operation. Backup your database before running.

-- Step 1: Get IDs of demo startups to delete
WITH demo_startup_ids AS (
  SELECT id FROM startups
  WHERE (data->>'name') IN (
    'QuantumFlow',
    'FinLedger',
    'SaaSStack',
    'PayRail',
    'ClinicCloud',
    'TradePulse',
    'EcoTrace AI',
    'NeuroVibe',
    'Demo Startup - PitchDeck Flow'
  )
  OR (data->>'name') LIKE '%Demo%'
  OR (data->>'name') LIKE '%demo%'
),
-- Step 2: Get IDs of demo communities
demo_community_ids AS (
  SELECT id FROM communities
  WHERE (data->>'name') LIKE '%NeuroVibe%'
  OR (data->>'name') LIKE '%Demo%'
  OR id LIKE '%demo%'
)

-- Step 3: Delete in order (respecting foreign keys)

-- Delete channels and community members first
DELETE FROM channels
WHERE (data->>'communityId') IN (SELECT id FROM demo_community_ids);

DELETE FROM community_members
WHERE (data->>'communityId') IN (SELECT id FROM demo_community_ids);

-- Delete communities
DELETE FROM communities
WHERE id IN (SELECT id FROM demo_community_ids);

-- Delete related data for demo startups
DELETE FROM deal_rooms
WHERE (data->>'startupId') IN (SELECT id FROM demo_startup_ids);

DELETE FROM investments
WHERE (data->>'startupId') IN (SELECT id FROM demo_startup_ids);

DELETE FROM funding_applications
WHERE (data->>'startupId') IN (SELECT id FROM demo_startup_ids);

DELETE FROM startup_documents
WHERE (data->>'startupId') IN (SELECT id FROM demo_startup_ids);

-- Delete demo startups
DELETE FROM startups
WHERE id IN (SELECT id FROM demo_startup_ids);

-- Delete all posts
DELETE FROM posts;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Demo data cleanup completed successfully at %', NOW();
  RAISE NOTICE 'Deleted: All posts, demo startups, and demo communities';
  RAISE NOTICE 'Preserved: All users';
END $$;
