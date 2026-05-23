-- ============================================================
-- Migration: Document System Rebuild
-- Adds document_files table (per-file tracking), adds metadata
-- columns to document_types and case_documents, migrates existing
-- uploaded files from case_documents into document_files.
-- ============================================================

-- ── 1. document_files table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS document_files (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_document_id  uuid NOT NULL REFERENCES case_documents(id) ON DELETE CASCADE,
  case_id           uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  firm_id           uuid NOT NULL REFERENCES firms(id),
  uploaded_by       uuid REFERENCES profiles(id),
  uploaded_by_portal text,           -- 'client' | 'sponsor' if via portal
  file_name         text NOT NULL,
  storage_path      text NOT NULL,
  file_size         int,
  mime_type         text,
  issue_date        date,
  expiry_date       date,
  notes             text,
  review_status     text DEFAULT 'pending', -- pending | approved | rejected
  review_notes      text,
  reviewed_by       uuid REFERENCES profiles(id),
  reviewed_at       timestamptz,
  uploaded_at       timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now()
);

-- ── 2. Migrate existing uploads from case_documents ──────────

INSERT INTO document_files (
  case_document_id,
  case_id,
  firm_id,
  file_name,
  storage_path,
  file_size,
  uploaded_by,
  expiry_date,
  review_notes,
  reviewed_by,
  reviewed_at,
  uploaded_at
)
SELECT
  id                                                           AS case_document_id,
  case_id,
  (SELECT firm_id FROM cases WHERE id = case_documents.case_id) AS firm_id,
  COALESCE(file_name, 'document')                              AS file_name,
  storage_path,
  file_size,
  uploaded_by,
  expiry_date,
  review_notes,
  reviewed_by,
  reviewed_at,
  COALESCE(uploaded_at, created_at)
FROM case_documents
WHERE storage_path IS NOT NULL
  AND (SELECT firm_id FROM cases WHERE id = case_documents.case_id) IS NOT NULL;

-- ── 3. New columns on document_types ────────────────────────

ALTER TABLE document_types
  ADD COLUMN IF NOT EXISTS tracks_expiry            boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_validity_days    int,
  ADD COLUMN IF NOT EXISTS reminder_days_before     int[]    DEFAULT '{90,30,7}',
  ADD COLUMN IF NOT EXISTS multiple_files_allowed   boolean  DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_requestable           boolean  DEFAULT true,
  ADD COLUMN IF NOT EXISTS conditional              boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_only            boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_visible          boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order               int      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category                 text;
  -- categories: identity | education | financial | health | employment
  --             | relationship | business | legal | internal

-- ── 4. New columns on case_documents ────────────────────────

ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS overall_status           text     DEFAULT 'missing',
  -- missing | uploaded | under_review | approved | rejected | waived | not_applicable
  ADD COLUMN IF NOT EXISTS waived_reason            text,
  ADD COLUMN IF NOT EXISTS waived_by                uuid     REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS not_applicable_reason    text,
  ADD COLUMN IF NOT EXISTS ai_requestable           boolean  DEFAULT true,
  ADD COLUMN IF NOT EXISTS tracks_expiry            boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS multiple_files_allowed   boolean  DEFAULT true,
  ADD COLUMN IF NOT EXISTS category                 text,
  ADD COLUMN IF NOT EXISTS sort_order               int      DEFAULT 0;

-- ── 5. Sync overall_status from existing status field ────────

UPDATE case_documents SET overall_status =
  CASE
    WHEN status = 'approved'  THEN 'approved'
    WHEN status = 'rejected'  THEN 'rejected'
    WHEN status = 'review'    THEN 'under_review'
    WHEN status = 'uploaded'  THEN 'uploaded'
    ELSE 'missing'
  END
WHERE overall_status IS NULL OR overall_status = 'missing';

-- ── 6. RLS for document_files ────────────────────────────────

ALTER TABLE document_files ENABLE ROW LEVEL SECURITY;

-- Firm agents: full access scoped to their firm
CREATE POLICY "Firm members can access document_files"
  ON document_files
  FOR ALL
  TO authenticated
  USING (firm_id = get_my_firm_id());

-- Service role: unrestricted
GRANT ALL ON document_files TO service_role;

-- ── 7. Performance indexes ───────────────────────────────────

CREATE INDEX IF NOT EXISTS document_files_case_document_id_idx ON document_files (case_document_id);
CREATE INDEX IF NOT EXISTS document_files_case_id_idx          ON document_files (case_id);
CREATE INDEX IF NOT EXISTS document_files_firm_id_idx          ON document_files (firm_id);
