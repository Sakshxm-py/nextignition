-- ============================================================
-- NextIgnition — public_leads table
-- Stores unauthenticated visitor registrations from the
-- public registration page (/register) for sales follow-up.
-- ============================================================

CREATE TABLE IF NOT EXISTS public_leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick email lookup
CREATE INDEX IF NOT EXISTS idx_public_leads_email ON public_leads (email);

-- Index for filtering by role
CREATE INDEX IF NOT EXISTS idx_public_leads_role ON public_leads USING GIN ((data->'role'));

-- Index for filtering by status (new | contacted | onboarded | rejected)
CREATE INDEX IF NOT EXISTS idx_public_leads_status ON public_leads USING GIN ((data->'status'));

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_public_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_public_leads_updated_at ON public_leads;
CREATE TRIGGER trg_public_leads_updated_at
  BEFORE UPDATE ON public_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_public_leads_updated_at();

-- Row-Level Security (optional — disable if using service key only)
-- ALTER TABLE public_leads ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public_leads IS
  'Stores unauthenticated visitor lead data submitted via the public /register page. Used by sales team for onboarding outreach.';
