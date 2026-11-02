-- Migration 003: 2-Level Admin Access Control System
-- Created: 2026-04-14
-- Description: Add admin_users table and admin_activity_logs for RBAC implementation

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('PRIMARY_ADMIN', 'SECONDARY_ADMIN')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'suspended')) DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    last_login TIMESTAMP
);

-- Create admin_activity_logs table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_id VARCHAR(500),
    target_type VARCHAR(100),
    change_summary JSONB,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_module ON admin_activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_timestamp ON admin_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_target_id ON admin_activity_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);

-- Add RLS policies for admin tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated admin users can read admin_users table
CREATE POLICY admin_users_read_policy ON admin_users
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy: Only PRIMARY_ADMIN can modify admin_users
CREATE POLICY admin_users_modify_policy ON admin_users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE id = auth.uid() AND role = 'PRIMARY_ADMIN'
        )
    );

-- Policy: All authenticated users can read activity logs (filtered by app)
CREATE POLICY activity_logs_read_policy ON admin_activity_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy: Only authenticated admins can insert logs
CREATE POLICY activity_logs_insert_policy ON admin_activity_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE id = auth.uid() AND status = 'active'
        )
    );

-- Comments for documentation
COMMENT ON TABLE admin_users IS 'Stores admin user accounts with role-based access control (PRIMARY_ADMIN or SECONDARY_ADMIN)';
COMMENT ON TABLE admin_activity_logs IS 'Audit trail of all admin actions for compliance and debugging';
COMMENT ON COLUMN admin_users.role IS 'Admin role: PRIMARY_ADMIN (full access) or SECONDARY_ADMIN (operational only)';
COMMENT ON COLUMN admin_users.status IS 'Admin account status: active or suspended';
COMMENT ON COLUMN admin_activity_logs.change_summary IS 'JSON object describing what was changed (before/after values)';
