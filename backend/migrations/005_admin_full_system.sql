-- Migration 005: Full Admin System Support
-- Created: 2026-05-09
-- Description: Ensures all administrative tables exist and match the code implementation

-- 1. Create admin_users table (stores secondary admins)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('PRIMARY_ADMIN', 'SECONDARY_ADMIN')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'suspended')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. Create admin_logs table (audit trail)
-- Matches backend/src/utils/adminLogger.ts which uses 'admin_logs'
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_id VARCHAR(500),
    change_summary JSONB,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Create platform_settings table
-- Matches backend/src/controllers/adminController.ts which uses 'platform_settings'
CREATE TABLE IF NOT EXISTS platform_settings (
    id VARCHAR(50) PRIMARY KEY, -- usually 'global'
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_module ON admin_logs(module);
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON admin_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- 5. Insert initial global settings if not exists
INSERT INTO platform_settings (id, data)
VALUES ('global', '{"maintenanceMode": false, "allowRegistration": true, "useGPT4": false, "dailyLimit": 10, "temperature": 0.7, "supportEmail": "support@nextignition.io"}')
ON CONFLICT (id) DO NOTHING;

-- 6. Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Note: In a real production environment, you'd add specific policies here.
-- For now, we rely on the service role key used by the backend.
