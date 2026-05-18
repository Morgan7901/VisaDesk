-- ============================================================
-- 004: Communications, trust, and portal tables
-- ============================================================

create table communications (
  id               uuid        primary key default gen_random_uuid(),
  case_id          uuid        references cases(id),
  firm_id          uuid        references firms(id),
  author_id        uuid        references profiles(id),
  comm_type        text,
  direction        text,
  subject          text,
  body             text        not null,
  is_omara_logged  boolean     not null default true,
  created_at       timestamptz not null default now()
);

create table trust_accounts (
  id              uuid           primary key default gen_random_uuid(),
  firm_id         uuid           not null references firms(id) unique,
  bsb             text,
  account_number  text,
  balance         decimal(10,2)  not null default 0,
  updated_at      timestamptz    not null default now()
);

create table trust_transactions (
  id               uuid          primary key default gen_random_uuid(),
  firm_id          uuid          references firms(id),
  case_id          uuid          references cases(id),
  transaction_type text,
  category         text,
  description      text          not null,
  amount           decimal(10,2) not null,
  invoice_number   text,
  receipt_url      text,
  created_by       uuid          references profiles(id),
  created_at       timestamptz   not null default now()
);

create table portal_invitations (
  id           uuid        primary key default gen_random_uuid(),
  case_id      uuid        references cases(id),
  email        text        not null,
  portal_type  text,
  token        text        not null unique default gen_random_uuid()::text,
  accepted     boolean     not null default false,
  sent_at      timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '7 days'
);
