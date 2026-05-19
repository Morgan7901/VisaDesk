-- ============================================================
-- 011: Add portal_upload to case_documents
-- Denormalise portal_upload from document_types onto the
-- case_document row so portal queries can filter directly
-- without relying on a FK join.
-- ============================================================

alter table case_documents
  add column if not exists portal_upload text;

-- Back-fill existing rows that have a document_type_id
update case_documents cd
set    portal_upload = dt.portal_upload
from   document_types dt
where  cd.document_type_id = dt.id
  and  cd.portal_upload is distinct from dt.portal_upload;
