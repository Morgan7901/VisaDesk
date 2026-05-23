-- Migration: Document UX improvements
-- Adds request tracking, workflow stage linking, and template reference to case_documents.

ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS template_document_id uuid REFERENCES document_types(id),
  ADD COLUMN IF NOT EXISTS requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS request_message text,
  ADD COLUMN IF NOT EXISTS workflow_stage_id uuid REFERENCES workflow_stages(id);

-- Add 'requested' to the valid statuses (no constraint change needed, it's a text field)
-- Add 'expired' status support (handled in UI based on expiry dates)

GRANT ALL ON case_documents TO service_role;
