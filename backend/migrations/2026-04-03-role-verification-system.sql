-- ============================================================================
-- Role Verification System - Database Migration
-- ============================================================================
-- This migration adds support for multi-role verification with admin approval
-- Created: 2026-04-03
-- Phase 1 Implementation
-- ============================================================================

-- Add role-related columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS primaryRole VARCHAR(20),
ADD COLUMN IF NOT EXISTS founderProfileData JSONB,
ADD COLUMN IF NOT EXISTS expertProfileData JSONB,
ADD COLUMN IF NOT EXISTS investorProfileData JSONB,
ADD COLUMN IF NOT EXISTS profileCompleteness JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS phoneVerified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS linkedInVerified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS identityVerified BOOLEAN DEFAULT FALSE;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN (roles);
CREATE INDEX IF NOT EXISTS idx_users_primary_role ON users(primaryRole);

-- Create admin_notifications table for role approval workflow
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    userName VARCHAR(255),
    userEmail VARCHAR(255),
    role VARCHAR(20),
    profileData JSONB,
    isResubmission BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT NOW(),
    reviewedAt TIMESTAMP,
    reviewedBy VARCHAR(255),
    notes TEXT
);

-- Create indexes for admin notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(createdAt DESC);

-- ============================================================================
-- Data Migration: Convert existing role flags to new roles array
-- ============================================================================

-- Migrate existing founder profiles
UPDATE users 
SET roles = roles || jsonb_build_array(
    jsonb_build_object(
        'type', 'founder',
        'status', 'verified',
        'appliedAt', COALESCE(createdAt, NOW())::text,
        'verifiedAt', COALESCE(createdAt, NOW())::text,
        'verificationLevel', 'basic',
        'badges', '["verified-founder"]',
        'completeness', 70
    )
)
WHERE isFounder = TRUE 
AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(roles, '[]'::jsonb)) role 
    WHERE role->>'type' = 'founder'
);

-- Migrate existing expert profiles  
UPDATE users
SET roles = roles || jsonb_build_array(
    jsonb_build_object(
        'type', 'expert',
        'status', 'verified',
        'appliedAt', COALESCE(createdAt, NOW())::text,
        'verifiedAt', COALESCE(createdAt, NOW())::text,
        'verificationLevel', 'basic',
        'badges', '["verified-expert"]',
        'completeness', 75
    )
)
WHERE isExpert = TRUE
AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(roles, '[]'::jsonb)) role 
    WHERE role->>'type' = 'expert'
);

-- Migrate existing investor profiles
UPDATE users
SET roles = roles || jsonb_build_array(
    jsonb_build_object(
        'type', 'investor',
        'status', 'verified',
        'appliedAt', COALESCE(createdAt, NOW())::text,
        'verifiedAt', COALESCE(createdAt, NOW())::text,
        'verificationLevel', 'basic',
        'badges', '["verified-investor"]',
        'completeness', 80
    )
)
WHERE isInvestor = TRUE
AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(roles, '[]'::jsonb)) role 
    WHERE role->>'type' = 'investor'
);

-- Set primary role for users (priority: investor > expert > founder)
UPDATE users
SET primaryRole = CASE
    WHEN isInvestor = TRUE THEN 'investor'
    WHEN isExpert = TRUE THEN 'expert'
    WHEN isFounder = TRUE THEN 'founder'
    ELSE NULL
END
WHERE primaryRole IS NULL 
AND (isFounder = TRUE OR isExpert = TRUE OR isInvestor = TRUE);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get all verified roles for a user
CREATE OR REPLACE FUNCTION get_verified_roles(user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
    verified_roles TEXT[];
BEGIN
    SELECT ARRAY_AGG(role->>'type')
    INTO verified_roles
    FROM users,
         jsonb_array_elements(COALESCE(roles, '[]'::jsonb)) role
    WHERE id = user_id
    AND role->>'status' = 'verified';
    
    RETURN COALESCE(verified_roles, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has a specific verified role
CREATE OR REPLACE FUNCTION has_verified_role(user_id UUID, role_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM users,
             jsonb_array_elements(COALESCE(roles, '[]'::jsonb)) role
        WHERE id = user_id
        AND role->>'type' = role_type
        AND role->>'status' = 'verified'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get pending role applications count
CREATE OR REPLACE FUNCTION get_pending_role_applications_count()
RETURNS INTEGER AS $$
DECLARE
    pending_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO pending_count
    FROM users,
         jsonb_array_elements(COALESCE(roles, '[]'::jsonb)) role
    WHERE role->>'status' = 'pending';
    
    RETURN COALESCE(pending_count, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Views for Admin Dashboard
-- ============================================================================

-- View: Pending role applications
CREATE OR REPLACE VIEW pending_role_applications AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    role->>'type' as role_type,
    role->>'appliedAt' as applied_at,
    role->>'completeness' as completeness,
    u.isVerified as email_verified,
    u.phoneVerified as phone_verified,
    u.linkedInVerified as linkedin_verified,
    u.createdAt as user_created_at
FROM users u,
     jsonb_array_elements(COALESCE(u.roles, '[]'::jsonb)) role
WHERE role->>'status' = 'pending'
ORDER BY (role->>'appliedAt')::timestamp ASC;

-- View: Role verification statistics
CREATE OR REPLACE VIEW role_verification_stats AS
SELECT 
    role->>'type' as role_type,
    role->>'status' as status,
    COUNT(*) as count
FROM users,
     jsonb_array_elements(COALESCE(roles, '[]'::jsonb)) role
GROUP BY role->>'type', role->>'status'
ORDER BY role->>'type', role->>'status';

-- ============================================================================
-- Verification Triggers
-- ============================================================================

-- Trigger to update profileCompleteness when profile data changes
CREATE OR REPLACE FUNCTION update_profile_completeness()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be implemented based on your completeness calculation logic
    -- For now, just ensure the column exists
    IF NEW.profileCompleteness IS NULL THEN
        NEW.profileCompleteness = '{}'::jsonb;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_completeness
    BEFORE UPDATE ON users
    FOR EACH ROW
    WHEN (
        OLD.founderProfileData IS DISTINCT FROM NEW.founderProfileData OR
        OLD.expertProfileData IS DISTINCT FROM NEW.expertProfileData OR
        OLD.investorProfileData IS DISTINCT FROM NEW.investorProfileData
    )
    EXECUTE FUNCTION update_profile_completeness();

-- ============================================================================
-- Permissions & Comments
-- ============================================================================

COMMENT ON COLUMN users.roles IS 'Array of role objects with verification status, badges, and metadata';
COMMENT ON COLUMN users.primaryRole IS 'Primary role displayed on profile (founder, expert, or investor)';
COMMENT ON COLUMN users.founderProfileData IS 'Founder-specific profile data (company info, stage, etc.)';
COMMENT ON COLUMN users.expertProfileData IS 'Expert-specific profile data (expertise areas, hourly rate, etc.)';
COMMENT ON COLUMN users.investorProfileData IS 'Investor-specific profile data (ticket size, portfolio, etc.)';
COMMENT ON COLUMN users.profileCompleteness IS 'Profile completeness percentage for each role';

COMMENT ON TABLE admin_notifications IS 'Admin notifications for role applications and other review tasks';

-- ============================================================================
-- Sample Queries for Testing
-- ============================================================================

-- Query: Get all users with pending investor applications
-- SELECT * FROM pending_role_applications WHERE role_type = 'investor';

-- Query: Get verification stats
-- SELECT * FROM role_verification_stats;

-- Query: Get pending applications count
-- SELECT get_pending_role_applications_count();

-- Query: Check if user has verified investor role
-- SELECT has_verified_role('user-uuid-here', 'investor');

-- Query: Get all verified roles for a user
-- SELECT get_verified_roles('user-uuid-here');

-- ============================================================================
-- Rollback Instructions
-- ============================================================================
-- To rollback this migration:
-- 
-- DROP VIEW IF EXISTS pending_role_applications;
-- DROP VIEW IF EXISTS role_verification_stats;
-- DROP FUNCTION IF EXISTS get_verified_roles(UUID);
-- DROP FUNCTION IF EXISTS has_verified_role(UUID, TEXT);
-- DROP FUNCTION IF EXISTS get_pending_role_applications_count();
-- DROP FUNCTION IF EXISTS update_profile_completeness();
-- DROP TRIGGER IF EXISTS trigger_update_profile_completeness ON users;
-- DROP TABLE IF EXISTS admin_notifications;
-- ALTER TABLE users 
--   DROP COLUMN IF EXISTS roles,
--   DROP COLUMN IF EXISTS primaryRole,
--   DROP COLUMN IF EXISTS founderProfileData,
--   DROP COLUMN IF EXISTS expertProfileData,
--   DROP COLUMN IF EXISTS investorProfileData,
--   DROP COLUMN IF EXISTS profileCompleteness,
--   DROP COLUMN IF EXISTS phoneVerified,
--   DROP COLUMN IF EXISTS linkedInVerified,
--   DROP COLUMN IF EXISTS identityVerified;
