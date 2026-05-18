-- ============================================================
-- 003: Document tables
-- ============================================================

create table document_types (
  id            uuid    primary key default gen_random_uuid(),
  visa_subclass text,
  label         text    not null,
  description   text,
  is_required   boolean not null default true,
  portal_upload text
);

create table case_documents (
  id                 uuid        primary key default gen_random_uuid(),
  case_id            uuid        not null references cases(id) on delete cascade,
  document_type_id   uuid        references document_types(id),
  label              text        not null,
  status             text        not null default 'pending',
  uploaded_by        uuid        references profiles(id),
  uploaded_at        timestamptz,
  storage_path       text,
  file_name          text,
  file_size          int,
  review_notes       text,
  reviewed_by        uuid        references profiles(id),
  reviewed_at        timestamptz,
  expiry_date        date
);
