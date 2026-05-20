-- AI-generated documents table — stores drafts created via the AI Tools tab.
-- Written and read by authenticated firm members; service role has full access.

CREATE TABLE ai_documents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       uuid        NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  firm_id       uuid        NOT NULL REFERENCES firms(id),
  created_by    uuid        REFERENCES profiles(id),
  document_type text        NOT NULL,
  title         text        NOT NULL,
  content       text        NOT NULL,
  model         text        DEFAULT 'claude-sonnet-4-20250514',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX ON ai_documents (case_id, created_at DESC);

GRANT ALL ON ai_documents TO service_role;

ALTER TABLE ai_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can CRUD ai_documents"
  ON ai_documents
  FOR ALL
  TO authenticated
  USING (firm_id = get_my_firm_id());
