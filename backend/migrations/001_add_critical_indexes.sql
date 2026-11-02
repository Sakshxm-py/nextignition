-- NextIgnition: Critical Database Indexes Migration
-- Description: Add missing indexes on frequently queried columns for performance
-- Created: 2026-03-31

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users USING GIN(data);
COMMENT ON INDEX idx_users_email IS 'Index on data->>email for user lookups during auth';

CREATE INDEX IF NOT EXISTS idx_users_role ON users USING GIN(data);
COMMENT ON INDEX idx_users_role IS 'Index on data->>role for role-based queries';

-- Communities table indexes
CREATE INDEX IF NOT EXISTS idx_communities_creator ON communities USING GIN(data);
COMMENT ON INDEX idx_communities_creator IS 'Index on data->>creator for listing user communities';

CREATE INDEX IF NOT EXISTS idx_communities_members ON communities USING GIN(data);
COMMENT ON INDEX idx_communities_members IS 'Index on data->members for membership checks';

-- Posts/Feed table indexes
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts USING GIN(data);
COMMENT ON INDEX idx_posts_author IS 'Index on data->>author for feed queries';

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at);
COMMENT ON INDEX idx_posts_created_at IS 'Index on created_at for chronological feed sorting';

-- Startups table indexes
CREATE INDEX IF NOT EXISTS idx_startups_founder ON startups USING GIN(data);
COMMENT ON INDEX idx_startups_founder IS 'Index on data->>founder for founder queries';

CREATE INDEX IF NOT EXISTS idx_startups_stage ON startups USING GIN(data);
COMMENT ON INDEX idx_startups_stage IS 'Index on data->>stage for pipeline filtering';

-- Funding applications indexes
CREATE INDEX IF NOT EXISTS idx_funding_apps_founder ON funding_applications USING GIN(data);
COMMENT ON INDEX idx_funding_apps_founder IS 'Index on data->>founder for user funding apps';

CREATE INDEX IF NOT EXISTS idx_funding_apps_status ON funding_applications USING GIN(data);
COMMENT ON INDEX idx_funding_apps_status IS 'Index on data->>status for draft/submitted filtering';

-- Deal rooms indexes
CREATE INDEX IF NOT EXISTS idx_deal_rooms_founder ON deal_rooms USING GIN(data);
COMMENT ON INDEX idx_deal_rooms_founder IS 'Index on data->>founder for deal room listing';

CREATE INDEX IF NOT EXISTS idx_deal_rooms_funding_app ON deal_rooms USING GIN(data);
COMMENT ON INDEX idx_deal_rooms_funding_app IS 'Index on data->>fundingApplication for deal room creation/lookup';

-- Messages/Comments indexes
CREATE INDEX IF NOT EXISTS idx_community_messages_channel ON community_messages USING GIN(data);
COMMENT ON INDEX idx_community_messages_channel IS 'Index on data->>channelId for message retrieval';

CREATE INDEX IF NOT EXISTS idx_community_messages_created_at ON community_messages (created_at);
COMMENT ON INDEX idx_community_messages_created_at IS 'Index on created_at for chronological message sorting';

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications USING GIN(data);
COMMENT ON INDEX idx_notifications_user IS 'Index on data->>userId for user notifications';

-- Performance: Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email_role ON users USING GIN(data);
COMMENT ON INDEX idx_users_email_role IS 'Composite-like index for email+role auth checks';

CREATE INDEX IF NOT EXISTS idx_startups_founder_stage ON startups USING GIN(data);
COMMENT ON INDEX idx_startups_founder_stage IS 'Composite-like index for founder startup pipeline';

-- Vacuum and analyze after index creation
VACUUM ANALYZE users;
VACUUM ANALYZE communities;
VACUUM ANALYZE posts;
VACUUM ANALYZE startups;
VACUUM ANALYZE funding_applications;
VACUUM ANALYZE deal_rooms;
VACUUM ANALYZE community_messages;
VACUUM ANALYZE notifications;
