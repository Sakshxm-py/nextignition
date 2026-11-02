-- ============================================================
-- NextIgnition — contact_messages table
-- Stores submissions from the public "Contact Us" form
-- (/contact) so the admin team can read and respond to them.
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Filter unread vs read messages (data.status = 'new' | 'read')
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages USING GIN ((data->'status'));

-- Newest-first listing
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages (created_at DESC);

COMMENT ON TABLE contact_messages IS
  'Submissions from the public Contact Us form. Read by admins in the Contact Messages section.';
