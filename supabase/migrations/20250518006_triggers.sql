-- ============================================================
-- 006: Bootstrap triggers
-- ============================================================

-- ── Trigger 1: auto-create profile on new auth user ──────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'agent');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ── Trigger 2: auto-create trust account on new firm ─────────

create or replace function public.handle_new_firm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trust_accounts (firm_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_firm_created
  after insert on firms
  for each row
  execute function public.handle_new_firm();
