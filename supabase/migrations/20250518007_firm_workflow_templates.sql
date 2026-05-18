-- ============================================================
-- 007: Firm-scoped workflow templates
-- ============================================================

-- ── 1. Add firm_id to workflow_templates ─────────────────────

alter table workflow_templates
  add column firm_id uuid references firms(id) on delete cascade;

-- ── 2. Replace the global unique constraint ───────────────────
-- The old constraint is named workflow_templates_visa_subclass_key
-- by Postgres convention.

alter table workflow_templates
  drop constraint workflow_templates_visa_subclass_key;

-- Composite unique for firm-owned templates (null != null in
-- Postgres unique constraints, so we also need the partial index
-- below to keep global templates deduplicated).
alter table workflow_templates
  add constraint workflow_templates_firm_visa_unique
  unique (firm_id, visa_subclass);

-- Prevent duplicate global templates (firm_id is null).
create unique index workflow_templates_global_visa_unique
  on workflow_templates (visa_subclass)
  where firm_id is null;

-- ── 3. Replace workflow_templates RLS policies ────────────────

drop policy "workflow_templates: authenticated read" on workflow_templates;

-- Read: global templates (firm_id is null) + own firm's templates.
create policy "workflow_templates: read global and own firm"
  on workflow_templates for select
  to authenticated
  using (
    firm_id is null
    or firm_id = get_my_firm_id()
  );

-- Write: firm-scoped rows only.
create policy "workflow_templates: firm insert"
  on workflow_templates for insert
  to authenticated
  with check (firm_id = get_my_firm_id());

create policy "workflow_templates: firm update"
  on workflow_templates for update
  to authenticated
  using  (firm_id = get_my_firm_id())
  with check (firm_id = get_my_firm_id());

create policy "workflow_templates: firm delete"
  on workflow_templates for delete
  to authenticated
  using (firm_id = get_my_firm_id());

-- ── 4. Replace workflow_stages RLS policies ───────────────────
-- No firm_id column; resolve via parent template.

drop policy "workflow_stages: authenticated read" on workflow_stages;

create policy "workflow_stages: read global and own firm"
  on workflow_stages for select
  to authenticated
  using (
    exists (
      select 1 from workflow_templates t
      where t.id = workflow_stages.template_id
        and (t.firm_id is null or t.firm_id = get_my_firm_id())
    )
  );

create policy "workflow_stages: firm insert"
  on workflow_stages for insert
  to authenticated
  with check (
    exists (
      select 1 from workflow_templates t
      where t.id = workflow_stages.template_id
        and t.firm_id = get_my_firm_id()
    )
  );

create policy "workflow_stages: firm update"
  on workflow_stages for update
  to authenticated
  using (
    exists (
      select 1 from workflow_templates t
      where t.id = workflow_stages.template_id
        and t.firm_id = get_my_firm_id()
    )
  )
  with check (
    exists (
      select 1 from workflow_templates t
      where t.id = workflow_stages.template_id
        and t.firm_id = get_my_firm_id()
    )
  );

create policy "workflow_stages: firm delete"
  on workflow_stages for delete
  to authenticated
  using (
    exists (
      select 1 from workflow_templates t
      where t.id = workflow_stages.template_id
        and t.firm_id = get_my_firm_id()
    )
  );

-- ── 5. Replace workflow_tasks RLS policies ────────────────────
-- No firm_id column; resolve via parent stage → template.

drop policy "workflow_tasks: authenticated read" on workflow_tasks;

create policy "workflow_tasks: read global and own firm"
  on workflow_tasks for select
  to authenticated
  using (
    exists (
      select 1
      from workflow_stages s
      join workflow_templates t on t.id = s.template_id
      where s.id = workflow_tasks.stage_id
        and (t.firm_id is null or t.firm_id = get_my_firm_id())
    )
  );

create policy "workflow_tasks: firm insert"
  on workflow_tasks for insert
  to authenticated
  with check (
    exists (
      select 1
      from workflow_stages s
      join workflow_templates t on t.id = s.template_id
      where s.id = workflow_tasks.stage_id
        and t.firm_id = get_my_firm_id()
    )
  );

create policy "workflow_tasks: firm update"
  on workflow_tasks for update
  to authenticated
  using (
    exists (
      select 1
      from workflow_stages s
      join workflow_templates t on t.id = s.template_id
      where s.id = workflow_tasks.stage_id
        and t.firm_id = get_my_firm_id()
    )
  )
  with check (
    exists (
      select 1
      from workflow_stages s
      join workflow_templates t on t.id = s.template_id
      where s.id = workflow_tasks.stage_id
        and t.firm_id = get_my_firm_id()
    )
  );

create policy "workflow_tasks: firm delete"
  on workflow_tasks for delete
  to authenticated
  using (
    exists (
      select 1
      from workflow_stages s
      join workflow_templates t on t.id = s.template_id
      where s.id = workflow_tasks.stage_id
        and t.firm_id = get_my_firm_id()
    )
  );

-- ── 6. Clone function ─────────────────────────────────────────

create or replace function clone_workflow_for_firm(
  p_visa_subclass text,
  p_firm_id       uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src_template_id  uuid;
  v_new_template_id  uuid;
  v_src_stage        record;
  v_new_stage_id     uuid;
begin
  -- Locate the global template for this subclass.
  select id into v_src_template_id
  from workflow_templates
  where visa_subclass = p_visa_subclass
    and firm_id is null;

  if v_src_template_id is null then
    raise exception
      'No global workflow template found for visa subclass "%"', p_visa_subclass;
  end if;

  -- Guard: firm already has a template for this subclass.
  if exists (
    select 1 from workflow_templates
    where visa_subclass = p_visa_subclass
      and firm_id = p_firm_id
  ) then
    raise exception
      'Firm already has a workflow template for visa subclass "%"', p_visa_subclass;
  end if;

  -- Copy the template row.
  insert into workflow_templates (firm_id, visa_subclass, label, description, is_active)
  select p_firm_id, visa_subclass, label, description, is_active
  from   workflow_templates
  where  id = v_src_template_id
  returning id into v_new_template_id;

  -- Copy stages, then each stage's tasks.
  for v_src_stage in
    select *
    from   workflow_stages
    where  template_id = v_src_template_id
    order  by stage_order
  loop
    v_new_stage_id := gen_random_uuid();

    insert into workflow_stages (id, template_id, stage_order, label, icon, description)
    values (
      v_new_stage_id,
      v_new_template_id,
      v_src_stage.stage_order,
      v_src_stage.label,
      v_src_stage.icon,
      v_src_stage.description
    );

    insert into workflow_tasks
      (stage_id, task_order, label, is_required, trigger_action, trigger_type, requires_portal)
    select
      v_new_stage_id,
      task_order, label, is_required, trigger_action, trigger_type, requires_portal
    from  workflow_tasks
    where stage_id = v_src_stage.id
    order by task_order;
  end loop;

  return v_new_template_id;
end;
$$;
