-- ============================================================
-- 005: Row Level Security policies
-- ============================================================

-- ── Enable RLS on every table ─────────────────────────────────

alter table firms                enable row level security;
alter table profiles             enable row level security;
alter table clients              enable row level security;
alter table sponsors             enable row level security;
alter table cases                enable row level security;
alter table deadlines            enable row level security;
alter table workflow_templates   enable row level security;
alter table workflow_stages      enable row level security;
alter table workflow_tasks       enable row level security;
alter table case_stage_progress  enable row level security;
alter table case_task_progress   enable row level security;
alter table automation_log       enable row level security;
alter table document_types       enable row level security;
alter table case_documents       enable row level security;
alter table communications       enable row level security;
alter table trust_accounts       enable row level security;
alter table trust_transactions   enable row level security;
alter table portal_invitations   enable row level security;

-- ── Helper: resolve firm for the calling user ─────────────────

create or replace function get_my_firm_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select firm_id from profiles where id = auth.uid();
$$;

-- ── firms ─────────────────────────────────────────────────────

create policy "firms: members can view own firm"
  on firms for select
  to authenticated
  using (id = get_my_firm_id());

create policy "firms: members can update own firm"
  on firms for update
  to authenticated
  using (id = get_my_firm_id())
  with check (id = get_my_firm_id());

-- ── profiles ──────────────────────────────────────────────────

create policy "profiles: view all in same firm"
  on profiles for select
  to authenticated
  using (firm_id = get_my_firm_id());

create policy "profiles: update own row"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── clients ───────────────────────────────────────────────────

create policy "clients: firm full access"
  on clients for all
  to authenticated
  using (firm_id = get_my_firm_id())
  with check (firm_id = get_my_firm_id());

-- ── sponsors ──────────────────────────────────────────────────

create policy "sponsors: firm full access"
  on sponsors for all
  to authenticated
  using (firm_id = get_my_firm_id())
  with check (firm_id = get_my_firm_id());

-- ── cases ─────────────────────────────────────────────────────

create policy "cases: firm full access"
  on cases for all
  to authenticated
  using (firm_id = get_my_firm_id())
  with check (firm_id = get_my_firm_id());

-- ── deadlines ────────────────────────────────────────────────

create policy "deadlines: firm full access"
  on deadlines for all
  to authenticated
  using (firm_id = get_my_firm_id())
  with check (firm_id = get_my_firm_id());

-- ── case_stage_progress ───────────────────────────────────────
-- No firm_id column; join through cases.

create policy "case_stage_progress: firm full access"
  on case_stage_progress for all
  to authenticated
  using (
    exists (
      select 1 from cases
      where cases.id = case_stage_progress.case_id
        and cases.firm_id = get_my_firm_id()
    )
  )
  with check (
    exists (
      select 1 from cases
      where cases.id = case_stage_progress.case_id
        and cases.firm_id = get_my_firm_id()
    )
  );

-- ── case_task_progress ────────────────────────────────────────

create policy "case_task_progress: firm full access"
  on case_task_progress for all
  to authenticated
  using (
    exists (
      select 1 from cases
      where cases.id = case_task_progress.case_id
        and cases.firm_id = get_my_firm_id()
    )
  )
  with check (
    exists (
      select 1 from cases
      where cases.id = case_task_progress.case_id
        and cases.firm_id = get_my_firm_id()
    )
  );

-- ── automation_log ────────────────────────────────────────────

create policy "automation_log: firm full access"
  on automation_log for all
  to authenticated
  using (
    exists (
      select 1 from cases
      where cases.id = automation_log.case_id
        and cases.firm_id = get_my_firm_id()
    )
  )
  with check (
    exists (
      select 1 from cases
      where cases.id = automation_log.case_id
        and cases.firm_id = get_my_firm_id()
    )
  );

-- ── case_documents ────────────────────────────────────────────

create policy "case_documents: firm full access"
  on case_documents for all
  to authenticated
  using (
    exists (
      select 1 from cases
      where cases.id = case_documents.case_id
        and cases.firm_id = get_my_firm_id()
    )
  )
  with check (
    exists (
      select 1 from cases
      where cases.id = case_documents.case_id
        and cases.firm_id = get_my_firm_id()
    )
  );

-- ── communications ────────────────────────────────────────────

create policy "communications: firm full access"
  on communications for all
  to authenticated
  using (firm_id = get_my_firm_id())
  with check (firm_id = get_my_firm_id());

-- ── trust_accounts ────────────────────────────────────────────

create policy "trust_accounts: firm full access"
  on trust_accounts for all
  to authenticated
  using (firm_id = get_my_firm_id())
  with check (firm_id = get_my_firm_id());

-- ── trust_transactions ────────────────────────────────────────

create policy "trust_transactions: firm full access"
  on trust_transactions for all
  to authenticated
  using (firm_id = get_my_firm_id())
  with check (firm_id = get_my_firm_id());

-- ── portal_invitations ────────────────────────────────────────

create policy "portal_invitations: firm full access"
  on portal_invitations for all
  to authenticated
  using (
    exists (
      select 1 from cases
      where cases.id = portal_invitations.case_id
        and cases.firm_id = get_my_firm_id()
    )
  )
  with check (
    exists (
      select 1 from cases
      where cases.id = portal_invitations.case_id
        and cases.firm_id = get_my_firm_id()
    )
  );

-- ── Global reference data (read-only for all authenticated) ───

create policy "workflow_templates: authenticated read"
  on workflow_templates for select
  to authenticated
  using (true);

create policy "workflow_stages: authenticated read"
  on workflow_stages for select
  to authenticated
  using (true);

create policy "workflow_tasks: authenticated read"
  on workflow_tasks for select
  to authenticated
  using (true);

create policy "document_types: authenticated read"
  on document_types for select
  to authenticated
  using (true);
