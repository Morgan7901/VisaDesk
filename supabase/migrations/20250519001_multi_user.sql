-- ============================================================
-- 009: Multi-user — team invitations & role enforcement
-- ============================================================

-- ── 1. Extend profiles ───────────────────────────────────────

alter table profiles
  add column if not exists suspended   boolean not null default false,
  add column if not exists invited_by  uuid    references profiles(id);

-- ── 2. team_invitations table ────────────────────────────────

create table if not exists team_invitations (
  id          uuid        primary key default gen_random_uuid(),
  firm_id     uuid        not null references firms(id) on delete cascade,
  email       text        not null,
  role        text        not null,
  token       text        not null unique default gen_random_uuid()::text,
  invited_by  uuid        references profiles(id),
  accepted    boolean     not null default false,
  sent_at     timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days'
);

-- ── 3. RLS on team_invitations ───────────────────────────────

alter table team_invitations enable row level security;

-- Firm members can see their firm's invitations
create policy "team_invitations: firm members can view"
  on team_invitations for select
  to authenticated
  using (firm_id = get_my_firm_id());

-- Firm members can insert invitations for their firm
create policy "team_invitations: firm members can insert"
  on team_invitations for insert
  to authenticated
  with check (firm_id = get_my_firm_id());

-- Firm members can update invitations for their firm
create policy "team_invitations: firm members can update"
  on team_invitations for update
  to authenticated
  using  (firm_id = get_my_firm_id())
  with check (firm_id = get_my_firm_id());

-- Firm members can delete invitations for their firm
create policy "team_invitations: firm members can delete"
  on team_invitations for delete
  to authenticated
  using (firm_id = get_my_firm_id());

-- ── 4. Service role full access ───────────────────────────────

grant all on team_invitations to service_role;
