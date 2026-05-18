-- ============================================================
-- 001: Core tables
-- ============================================================

create table firms (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  mara_number text,
  abn         text,
  address     text,
  phone       text,
  email       text,
  logo_url    text,
  plan        text        not null default 'starter',
  created_at  timestamptz not null default now()
);

create table profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  firm_id     uuid        references firms(id),
  role        text        not null,
  full_name   text,
  email       text,
  mara_number text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table clients (
  id               uuid        primary key default gen_random_uuid(),
  firm_id          uuid        references firms(id),
  profile_id       uuid        references profiles(id),
  full_name        text        not null,
  email            text,
  phone            text,
  date_of_birth    date,
  nationality      text,
  passport_number  text,
  passport_expiry  date,
  portal_token     text        unique,
  portal_active    boolean     not null default false,
  created_at       timestamptz not null default now()
);

create table sponsors (
  id              uuid        primary key default gen_random_uuid(),
  firm_id         uuid        references firms(id),
  company_name    text        not null,
  abn             text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  sbs_status      text,
  sbs_expiry      date,
  portal_token    text        unique,
  portal_active   boolean     not null default false,
  created_at      timestamptz not null default now()
);

create table cases (
  id                uuid        primary key default gen_random_uuid(),
  firm_id           uuid        references firms(id),
  agent_id          uuid        references profiles(id),
  client_id         uuid        references clients(id),
  sponsor_id        uuid        references sponsors(id),
  ref_number        text        unique,
  visa_subclass     text        not null,
  visa_stream       text,
  status            text        not null default 'active',
  current_stage_id  uuid,
  lodgement_date    date,
  trn               text,
  grant_date        date,
  visa_expiry       date,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table deadlines (
  id             uuid        primary key default gen_random_uuid(),
  case_id        uuid        references cases(id) on delete cascade,
  firm_id        uuid        references firms(id),
  label          text        not null,
  deadline_date  date        not null,
  deadline_type  text,
  is_complete    boolean     not null default false,
  reminder_sent  boolean     not null default false,
  created_at     timestamptz not null default now()
);

-- ── updated_at trigger for cases ──────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cases_set_updated_at
  before update on cases
  for each row
  execute function set_updated_at();
