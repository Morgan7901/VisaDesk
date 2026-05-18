-- ============================================================
-- 002: Workflow tables
-- ============================================================

create table workflow_templates (
  id            uuid    primary key default gen_random_uuid(),
  visa_subclass text    not null unique,
  label         text    not null,
  description   text,
  is_active     boolean not null default true
);

create table workflow_stages (
  id          uuid    primary key default gen_random_uuid(),
  template_id uuid    not null references workflow_templates(id) on delete cascade,
  stage_order int     not null,
  label       text    not null,
  icon        text,
  description text
);

create table workflow_tasks (
  id              uuid    primary key default gen_random_uuid(),
  stage_id        uuid    not null references workflow_stages(id) on delete cascade,
  task_order      int     not null,
  label           text    not null,
  is_required     boolean not null default true,
  trigger_action  text,
  trigger_type    text,
  requires_portal text
);

create table case_stage_progress (
  id            uuid        primary key default gen_random_uuid(),
  case_id       uuid        not null references cases(id) on delete cascade,
  stage_id      uuid        not null references workflow_stages(id),
  is_complete   boolean     not null default false,
  completed_by  uuid        references profiles(id),
  completed_at  timestamptz,
  notes         text,
  unique (case_id, stage_id)
);

create table case_task_progress (
  id            uuid        primary key default gen_random_uuid(),
  case_id       uuid        not null references cases(id) on delete cascade,
  task_id       uuid        not null references workflow_tasks(id),
  is_complete   boolean     not null default false,
  completed_by  uuid        references profiles(id),
  completed_at  timestamptz,
  unique (case_id, task_id)
);

create table automation_log (
  id                  uuid        primary key default gen_random_uuid(),
  case_id             uuid        references cases(id),
  trigger_type        text,
  trigger_description text,
  fired_at            timestamptz not null default now(),
  fired_by            uuid        references profiles(id),
  status              text        not null default 'fired'
);
