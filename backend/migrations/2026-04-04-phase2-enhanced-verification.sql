-- ============================================================================
-- Phase 2: Enhanced Verification - Database Migration
-- ============================================================================
-- Adds LinkedIn OAuth, Phone Verification, and Document Upload support
-- Created: 2026-04-04
-- Phase 2 Implementation
-- ============================================================================

-- Add Phase 2 columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS linkedInProfile JSONB,
ADD COLUMN IF NOT EXISTS linkedInVerifiedAt TIMESTAMP,
ADD COLUMN IF NOT EXISTS phoneNumber VARCHAR(20),
ADD COLUMN IF NOT EXISTS phoneVerifiedAt TIMESTAMP,
ADD COLUMN IF NOT EXISTS phoneOtp VARCHAR(255),
ADD COLUMN IF NOT EXISTS phoneOtpExpiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS verificationScore INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS autoVerificationEligible BOOLEAN DEFAULT FALSE;

-- Create indexes for phone verification
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phoneNumber);
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phoneVerified);
CREATE INDEX IF NOT EXISTS idx_users_linkedin_verified ON users(linkedInVerified);

-- Create verification_documents table
CREATE TABLE IF NOT EXISTS verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    documentType VARCHAR(50) NOT NULL,  -- 'id', 'passport', 'portfolio', 'credential', etc.
    fileName VARCHAR(255) NOT NULL,
    fileUrl TEXT NOT NULL,
    fileSize INTEGER,
    mimeType VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',  -- pending/approved/rejected
    uploadedAt TIMESTAMP DEFAULT NOW(),
    reviewedAt TIMESTAMP,
    reviewedBy VARCHAR(255),
    notes TEXT,
    metadata JSONB
);

-- Create indexes for verification_documents
CREATE INDEX IF NOT EXISTS idx_verification_documents_user ON verification_documents(userId);
CREATE INDEX IF NOT EXISTS idx_verification_documents_status ON verification_documents(status);
CREATE INDEX IF NOT EXISTS idx_verification_documents_type ON verification_documents(documentType);

-- Create verification_logs table for audit trail
CREATE TABLE IF NOT EXISTS verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verificationType VARCHAR(50) NOT NULL,  -- 'phone', 'linkedin', 'document', 'auto-verify'
    action VARCHAR(50) NOT NULL,  -- 'initiated', 'completed', 'failed'
    metadata JSONB,
    ipAddress VARCHAR(45),
    userAgent TEXT,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- Create index for verification logs
CREATE INDEX IF NOT EXISTS idx_verification_logs_user ON verification_logs(userId);
CREATE INDEX IF NOT EXISTS idx_verification_logs_type ON verification_logs(verificationType);
CREATE INDEX IF NOT EXISTS idx_verification_logs_created ON verification_logs(createdAt DESC);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to calculate verification score
CREATE OR REPLACE FUNCTION calculate_verification_score(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    user_record RECORD;
BEGIN
    SELECT 
        isVerified,
        phoneVerified,
        linkedInVerified,
        identityVerified,
        roles
    INTO user_record
    FROM users
    WHERE id = user_id;
    
    -- Email verified: +10
    IF user_record.isVerified THEN
        score := score + 10;
    END IF;
    
    -- Phone verified: +10
    IF user_record.phoneVerified THEN
        score := score + 10;
    END IF;
    
    -- LinkedIn verified: +15
    IF user_record.linkedInVerified THEN
        score := score + 15;
    END IF;
    
    -- Identity verified: +20
    IF user_record.identityVerified THEN
        score := score + 20;
    END IF;
    
    -- Verified roles: +10 each (max +20)
    IF user_record.roles IS NOT NULL THEN
        SELECT COUNT(*) * 10 INTO score
        FROM jsonb_array_elements(user_record.roles) role
        WHERE role->>'status' = 'verified';
        
        score := LEAST(score + 20, score);
    END IF;
    
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to check auto-verification eligibility
CREATE OR REPLACE FUNCTION check_auto_verification_eligibility(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    score INTEGER;
    user_record RECORD;
BEGIN
    SELECT 
        phoneVerified,
        linkedInVerified,
        isVerified
    INTO user_record
    FROM users
    WHERE id = user_id;
    
    -- Must have email + phone + LinkedIn
    IF NOT (user_record.isVerified AND user_record.phoneVerified AND user_record.linkedInVerified) THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate score
    score := calculate_verification_score(user_id);
    
    -- Must have score >= 85
    RETURN score >= 85;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending documents count
CREATE OR REPLACE FUNCTION get_pending_documents_count()
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    SELECT COUNT(*) INTO count
    FROM verification_documents
    WHERE status = 'pending';
    
    RETURN COALESCE(count, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger to update verification score when verifications change
CREATE OR REPLACE FUNCTION update_verification_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.verificationScore := calculate_verification_score(NEW.id);
    NEW.autoVerificationEligible := check_auto_verification_eligibility(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_verification_score
    BEFORE UPDATE ON users
    FOR EACH ROW
    WHEN (
        OLD.isVerified IS DISTINCT FROM NEW.isVerified OR
        OLD.phoneVerified IS DISTINCT FROM NEW.phoneVerified OR
        OLD.linkedInVerified IS DISTINCT FROM NEW.linkedInVerified OR
        OLD.identityVerified IS DISTINCT FROM NEW.identityVerified OR
        OLD.roles IS DISTINCT FROM NEW.roles
    )
    EXECUTE FUNCTION update_verification_score_trigger();

-- ============================================================================
-- Views
-- ============================================================================

-- View: Pending document reviews
CREATE OR REPLACE VIEW pending_document_reviews AS
SELECT 
    d.id as document_id,
    d.userId as user_id,
    u.name as user_name,
    u.email as user_email,
    d.documentType,
    d.fileName,
    d.fileUrl,
    d.uploadedAt,
    u.isVerified as email_verified,
    u.phoneVerified,
    u.linkedInVerified
FROM verification_documents d
JOIN users u ON d.userId = u.id
WHERE d.status = 'pending'
ORDER BY d.uploadedAt ASC;

-- View: Auto-verification eligible users
CREATE OR REPLACE VIEW auto_verification_eligible_users AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.verificationScore,
    u.isVerified as email_verified,
    u.phoneVerified,
    u.linkedInVerified,
    u.createdAt,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(COALESCE(u.roles, '[]'::jsonb)) role
        WHERE role->>'status' = 'pending'
    ) as pending_roles_count
FROM users u
WHERE u.autoVerificationEligible = true
AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(u.roles, '[]'::jsonb)) role
    WHERE role->>'status' = 'pending'
)
ORDER BY u.verificationScore DESC, u.createdAt ASC;

-- View: Verification statistics
CREATE OR REPLACE VIEW verification_statistics AS
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE isVerified = true) as email_verified_count,
    COUNT(*) FILTER (WHERE phoneVerified = true) as phone_verified_count,
    COUNT(*) FILTER (WHERE linkedInVerified = true) as linkedin_verified_count,
    COUNT(*) FILTER (WHERE identityVerified = true) as identity_verified_count,
    COUNT(*) FILTER (WHERE autoVerificationEligible = true) as auto_verify_eligible_count,
    ROUND(AVG(verificationScore), 2) as avg_verification_score
FROM users;

-- ============================================================================
-- Sample Queries
-- ============================================================================

-- Query: Get pending document reviews
-- SELECT * FROM pending_document_reviews;

-- Query: Get auto-verification eligible users
-- SELECT * FROM auto_verification_eligible_users;

-- Query: Get verification statistics
-- SELECT * FROM verification_statistics;

-- Query: Calculate user's verification score
-- SELECT calculate_verification_score('user-uuid-here');

-- Query: Check if user is eligible for auto-verification
-- SELECT check_auto_verification_eligibility('user-uuid-here');

-- Query: Get pending documents count
-- SELECT get_pending_documents_count();

-- ============================================================================
-- Permissions & Comments
-- ============================================================================

COMMENT ON COLUMN users.linkedInProfile IS 'LinkedIn OAuth profile data (JSON)';
COMMENT ON COLUMN users.phoneNumber IS 'Verified phone number in E.164 format';
COMMENT ON COLUMN users.phoneOtp IS 'Hashed OTP for phone verification';
COMMENT ON COLUMN users.verificationScore IS 'Calculated verification score (0-100)';
COMMENT ON COLUMN users.autoVerificationEligible IS 'Whether user is eligible for auto-verification';

COMMENT ON TABLE verification_documents IS 'User-uploaded verification documents (ID, credentials, etc.)';
COMMENT ON TABLE verification_logs IS 'Audit log for all verification actions';

-- ============================================================================
-- Rollback Instructions
-- ============================================================================
-- To rollback this migration:
-- 
-- DROP VIEW IF EXISTS pending_document_reviews;
-- DROP VIEW IF EXISTS auto_verification_eligible_users;
-- DROP VIEW IF EXISTS verification_statistics;
-- DROP FUNCTION IF EXISTS calculate_verification_score(UUID);
-- DROP FUNCTION IF EXISTS check_auto_verification_eligibility(UUID);
-- DROP FUNCTION IF EXISTS get_pending_documents_count();
-- DROP FUNCTION IF EXISTS update_verification_score_trigger();
-- DROP TRIGGER IF EXISTS trigger_update_verification_score ON users;
-- DROP TABLE IF EXISTS verification_logs;
-- DROP TABLE IF EXISTS verification_documents;
-- ALTER TABLE users 
--   DROP COLUMN IF EXISTS linkedInProfile,
--   DROP COLUMN IF EXISTS linkedInVerifiedAt,
--   DROP COLUMN IF EXISTS phoneNumber,
--   DROP COLUMN IF EXISTS phoneVerifiedAt,
--   DROP COLUMN IF EXISTS phoneOtp,
--   DROP COLUMN IF EXISTS phoneOtpExpiry,
--   DROP COLUMN IF EXISTS verificationScore,
--   DROP COLUMN IF EXISTS autoVerificationEligible;
