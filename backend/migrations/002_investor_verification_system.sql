-- Investor Verification System Migration
-- Adds support for 3-tier investor verification: Unverified, Verified, Accredited

-- Add investor verification fields to users table (jsonb)
-- Note: These are stored in the data jsonb column
-- Structure:
-- data.role = 'investor' | 'startup' | 'cofounder' | etc
-- data.investorTier = 1 | 2 | 3  (Unverified | Verified | Accredited)
-- data.verifications = { linkedin: {verified: bool, url: string, verifiedAt: timestamp}, ... }
-- data.profileCompletion = { percentage: 0-100, completedFields: [...] }
-- data.adminVerification = { status: 'pending'|'approved'|'rejected', reviewedBy: userId, notes: string, reviewedAt: timestamp }

-- Create investor_verifications table for tracking verification history
create table if not exists public.investor_verifications (
  id text primary key,
  user_id text not null,
  platform varchar(50) not null,
  platform_url text,
  verified_at timestamptz default now(),
  verification_method varchar(50) not null, -- 'url_validation', 'api_validation', 'manual'
  is_valid boolean default false,
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, platform)
);

-- Create admin_verification_queue table for tier 3 accreditation reviews
create table if not exists public.admin_verification_queue (
  id text primary key,
  user_id text not null,
  tier_requested integer not null, -- 2 or 3
  status varchar(20) default 'pending', -- pending, approved, rejected
  profile_data jsonb, -- snapshot of user profile at request time
  notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, tier_requested, status) where status = 'pending'
);

-- Create indexes for performance
create index if not exists investor_verifications_user_id_idx on public.investor_verifications(user_id);
create index if not exists investor_verifications_platform_idx on public.investor_verifications(platform);
create index if not exists investor_verifications_verified_at_idx on public.investor_verifications(verified_at);

create index if not exists admin_verification_queue_user_id_idx on public.admin_verification_queue(user_id);
create index if not exists admin_verification_queue_status_idx on public.admin_verification_queue(status);
create index if not exists admin_verification_queue_created_at_idx on public.admin_verification_queue(created_at);

-- GIN index on users data column for investor-specific fields (already in 001_add_critical_indexes.sql, but ensuring)
create index if not exists users_investor_tier_idx on public.users using gin (data) where (data->>'role' = 'investor');
