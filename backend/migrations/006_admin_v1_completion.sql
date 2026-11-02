-- Migration 006: Admin Panel V1 completion
-- Adds AI prompt/usage logging and notification templates for the admin panel.

-- 1. AI logs (Ignisha) — one row per AI call, powers AI Control metrics + prompt logs
CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,                       -- caller (nullable; not a hard FK to keep logging non-blocking)
    feature VARCHAR(100) NOT NULL,      -- e.g. CHAT, PITCH_DECK, QUICK_ACTION
    model VARCHAR(150),                 -- model/provider actually used
    prompt TEXT,                        -- truncated prompt
    response TEXT,                      -- truncated response
    tokens INT,                         -- optional token estimate
    success BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_feature ON ai_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_logs(user_id);

-- 2. Notification templates — reusable broadcast templates (spec 3.8)
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',   -- info | success | warning | error
    created_by VARCHAR(255),                     -- admin id/email
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_created_at ON notification_templates(created_at DESC);

-- RLS: service role (backend) bypasses RLS; enable to deny anon by default.
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE ai_logs IS 'Ignisha AI call log — powers admin AI Control metrics and prompt logs';
COMMENT ON TABLE notification_templates IS 'Reusable admin broadcast templates (spec 3.8)';
