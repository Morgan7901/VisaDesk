-- AI generation usage tracking — one row per generation, used to enforce
-- monthly per-plan limits and provide usage analytics to firm admins.

CREATE TABLE ai_usage (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       uuid        NOT NULL REFERENCES firms(id),
  profile_id    uuid        REFERENCES profiles(id),
  case_id       uuid        REFERENCES cases(id),
  document_type text        NOT NULL,
  tokens_input  int,
  tokens_output int,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX ON ai_usage (firm_id, created_at DESC);

GRANT ALL ON ai_usage TO service_role;

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Firm admins (and all authenticated firm members) can view their own usage
CREATE POLICY "Firm admins can view ai_usage"
  ON ai_usage
  FOR SELECT
  TO authenticated
  USING (firm_id = get_my_firm_id());
