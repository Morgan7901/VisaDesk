-- ============================================================
-- Workflow seed data: SC-500 Student Visa & SC-482 TSS
-- ============================================================

do $$
declare
  -- ── Template IDs ──────────────────────────────────────────
  v_tmpl_500  uuid := gen_random_uuid();
  v_tmpl_482  uuid := gen_random_uuid();

  -- ── SC-500 Stage IDs ──────────────────────────────────────
  v_500_s1    uuid := gen_random_uuid();  -- Onboarding
  v_500_s2    uuid := gen_random_uuid();  -- Eligibility Assessment
  v_500_s3    uuid := gen_random_uuid();  -- Document Collection
  v_500_s4    uuid := gen_random_uuid();  -- Application Preparation
  v_500_s5    uuid := gen_random_uuid();  -- Lodgement
  v_500_s6    uuid := gen_random_uuid();  -- Post-Lodgement
  v_500_s7    uuid := gen_random_uuid();  -- Decision

  -- ── SC-482 Stage IDs ──────────────────────────────────────
  v_482_s1    uuid := gen_random_uuid();  -- Onboarding
  v_482_s2    uuid := gen_random_uuid();  -- Sponsorship
  v_482_s3    uuid := gen_random_uuid();  -- Labour Market Testing
  v_482_s4    uuid := gen_random_uuid();  -- Nomination
  v_482_s5    uuid := gen_random_uuid();  -- Visa Application
  v_482_s6    uuid := gen_random_uuid();  -- Decision

begin

  -- ============================================================
  -- Templates
  -- ============================================================

  -- firm_id = null marks these as system defaults; firms get their own
  -- editable copies via clone_workflow_for_firm().
  insert into workflow_templates (id, firm_id, visa_subclass, label, description) values
    (v_tmpl_500, null, '500', 'Student Visa (Subclass 500)',
     'Workflow for student visa applications including GTE assessment and CoE management.'),
    (v_tmpl_482, null, '482', 'Temporary Skill Shortage (Subclass 482)',
     'Workflow for TSS visa applications covering sponsorship, nomination, and visa stages.');

  -- ============================================================
  -- SC-500 Stages
  -- ============================================================

  insert into workflow_stages (id, template_id, stage_order, label, icon) values
    (v_500_s1, v_tmpl_500, 1, 'Onboarding',               'UserPlus'),
    (v_500_s2, v_tmpl_500, 2, 'Eligibility Assessment',    'ClipboardCheck'),
    (v_500_s3, v_tmpl_500, 3, 'Document Collection',       'FolderOpen'),
    (v_500_s4, v_tmpl_500, 4, 'Application Preparation',   'FileText'),
    (v_500_s5, v_tmpl_500, 5, 'Lodgement',                 'Send'),
    (v_500_s6, v_tmpl_500, 6, 'Post-Lodgement',            'Clock'),
    (v_500_s7, v_tmpl_500, 7, 'Decision',                  'CheckCircle');

  -- ── SC-500 Stage 1: Onboarding ────────────────────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_500_s1, 1, 'Obtain signed client agreement and retainer',          true,  null,               null),
    (v_500_s1, 2, 'Collect passport and photo ID',                        true,  null,               null),
    (v_500_s1, 3, 'Explain OSHC insurance requirement',                   true,  null,               null),
    (v_500_s1, 4, 'Send client portal invite',                            true,  'send_portal_invite','client'),
    (v_500_s1, 5, 'Create case file and assign reference number',         true,  null,               null);

  -- ── SC-500 Stage 2: Eligibility Assessment ────────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_500_s2, 1, 'Assess genuine temporary entrant (GTE) criteria',      true,  null,               null),
    (v_500_s2, 2, 'Confirm course enrolment and CoE details',             true,  null,               null),
    (v_500_s2, 3, 'Check English language requirement (IELTS/PTE/TOEFL)', true,  null,               null),
    (v_500_s2, 4, 'Assess financial capacity',                            true,  null,               null),
    (v_500_s2, 5, 'Check health and character requirements',              true,  null,               null),
    (v_500_s2, 6, 'Advise client on eligibility outcome',                 true,  'send_email',       null);

  -- ── SC-500 Stage 3: Document Collection ───────────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_500_s3, 1, 'Request documents from client via portal',             true,  'document_request', 'client'),
    (v_500_s3, 2, 'Confirm CoE received from institution',                true,  null,               null),
    (v_500_s3, 3, 'Confirm OSHC policy document received',                true,  null,               null),
    (v_500_s3, 4, 'Confirm English test results received',                true,  null,               null),
    (v_500_s3, 5, 'Confirm financial evidence received',                  true,  null,               null),
    (v_500_s3, 6, 'Confirm health assessment booked',                     true,  'create_deadline',  null),
    (v_500_s3, 7, 'Confirm police clearances obtained',                   true,  null,               null);

  -- ── SC-500 Stage 4: Application Preparation ───────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_500_s4, 1, 'Prepare Form 157A student visa application',           true,  null,               null),
    (v_500_s4, 2, 'Prepare GTE statement with client',                    true,  null,               'client'),
    (v_500_s4, 3, 'Complete health examinations and obtain HAP ID',       true,  null,               null),
    (v_500_s4, 4, 'Conduct final document review',                        true,  null,               null),
    (v_500_s4, 5, 'Obtain client sign-off on application',                true,  'send_email',       null);

  -- ── SC-500 Stage 5: Lodgement ─────────────────────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_500_s5, 1, 'Lodge application via ImmiAccount',                    true,  null,               null),
    (v_500_s5, 2, 'Record TRN (Transaction Reference Number)',            true,  null,               null),
    (v_500_s5, 3, 'Log lodgement to communications',                      true,  'system_note',      null),
    (v_500_s5, 4, 'Set bridging visa expiry deadline',                    true,  'create_deadline',  null),
    (v_500_s5, 5, 'Send lodgement confirmation to client',                true,  'send_email',       null);

  -- ── SC-500 Stage 6: Post-Lodgement ────────────────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_500_s6, 1, 'Monitor application status in ImmiAccount',            true,  null,               null),
    (v_500_s6, 2, 'Respond to any DHA requests for further information',  false, null,               null),
    (v_500_s6, 3, 'Log health and character clearances as received',      false, null,               null),
    (v_500_s6, 4, 'Monitor processing times',                             false, null,               null);

  -- ── SC-500 Stage 7: Decision ──────────────────────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_500_s7, 1, 'Record grant date and visa expiry',                    true,  null,               null),
    (v_500_s7, 2, 'Send grant notification to client',                    true,  'send_email',       null),
    (v_500_s7, 3, 'Record visa conditions (8105, 8202)',                  true,  null,               null),
    (v_500_s7, 4, 'Update case status to granted',                        true,  null,               null),
    (v_500_s7, 5, 'Archive case documents',                               true,  null,               null),
    (v_500_s7, 6, 'Prompt final fee invoice',                             true,  'trust_entry',      null);

  -- ============================================================
  -- SC-482 Stages
  -- ============================================================

  insert into workflow_stages (id, template_id, stage_order, label, icon) values
    (v_482_s1, v_tmpl_482, 1, 'Onboarding',               'UserPlus'),
    (v_482_s2, v_tmpl_482, 2, 'Sponsorship',               'Building2'),
    (v_482_s3, v_tmpl_482, 3, 'Labour Market Testing',     'Search'),
    (v_482_s4, v_tmpl_482, 4, 'Nomination',                'Briefcase'),
    (v_482_s5, v_tmpl_482, 5, 'Visa Application',          'FileText'),
    (v_482_s6, v_tmpl_482, 6, 'Decision',                  'CheckCircle');

  -- ── SC-482 Stage 1: Onboarding ────────────────────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_482_s1, 1, 'Obtain signed engagement letter from employer',        true,  null,                null),
    (v_482_s1, 2, 'Obtain signed engagement letter from worker',          true,  null,                null),
    (v_482_s1, 3, 'Confirm position details and ANZSCO code',             true,  null,                null),
    (v_482_s1, 4, 'Confirm salary meets TSMIT ($73,150)',                 true,  null,                null),
    (v_482_s1, 5, 'Check worker passport and current visa status',        true,  null,                null),
    (v_482_s1, 6, 'Send sponsor portal invite',                           true,  'send_portal_invite','sponsor'),
    (v_482_s1, 7, 'Send client portal invite to worker',                  true,  'send_portal_invite','client');

  -- ── SC-482 Stage 2: Sponsorship ───────────────────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_482_s2, 1, 'Confirm sponsor SBS status via DOHA',                  true,  null,                null),
    (v_482_s2, 2, 'If SBS not current, lodge Standard Business Sponsorship', false, null,             null),
    (v_482_s2, 3, 'Upload sponsor financial documents',                   true,  null,                'sponsor'),
    (v_482_s2, 4, 'Upload training record evidence',                      true,  null,                'sponsor'),
    (v_482_s2, 5, 'Set SBS decision deadline',                            true,  'create_deadline',   null),
    (v_482_s2, 6, 'Record SBS approval and expiry date',                  true,  null,                null);

  -- ── SC-482 Stage 3: Labour Market Testing ─────────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_482_s3, 1, 'Confirm LMT exemption applies (FTA country or earnings above threshold)', false, null, null),
    (v_482_s3, 2, 'If LMT required, confirm job ads placed on Seek and LinkedIn',            false, null, null),
    (v_482_s3, 3, 'Collect copies of all job advertisements',             false, null,                null),
    (v_482_s3, 4, 'Collect records of Australian applicant rejections',   false, null,                null),
    (v_482_s3, 5, 'Confirm 4-week advertising period completed',          false, 'create_deadline',   null),
    (v_482_s3, 6, 'Prepare LMT summary document',                         false, null,                null);

  -- ── SC-482 Stage 4: Nomination ────────────────────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_482_s4, 1, 'Prepare nomination application Form 1395',             true,  null,                null),
    (v_482_s4, 2, 'Confirm position description completed by sponsor',    true,  null,                'sponsor'),
    (v_482_s4, 3, 'Upload all nomination supporting documents',           true,  null,                null),
    (v_482_s4, 4, 'Confirm salary and TSMIT confirmed in writing',        true,  null,                null),
    (v_482_s4, 5, 'Lodge nomination via ImmiAccount',                     true,  null,                null),
    (v_482_s4, 6, 'Record nomination TRN',                                true,  'system_note',       null),
    (v_482_s4, 7, 'Set nomination decision deadline',                     true,  'create_deadline',   null),
    (v_482_s4, 8, 'Notify worker of nomination lodgement',                true,  'send_email',        null);

  -- ── SC-482 Stage 5: Visa Application ──────────────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_482_s5, 1, 'Confirm approved nomination received',                 true,  null,                null),
    (v_482_s5, 2, 'Request outstanding visa documents from worker',       true,  'document_request',  'client'),
    (v_482_s5, 3, 'Confirm health assessments booked',                    true,  'create_deadline',   null),
    (v_482_s5, 4, 'Confirm skills assessment obtained if required',       false, null,                null),
    (v_482_s5, 5, 'Confirm English language evidence obtained',           true,  null,                null),
    (v_482_s5, 6, 'Prepare visa application Form 1066',                   true,  null,                null),
    (v_482_s5, 7, 'Lodge visa application via ImmiAccount',               true,  null,                null),
    (v_482_s5, 8, 'Record visa application TRN',                          true,  'system_note',       null),
    (v_482_s5, 9, 'Send lodgement confirmation to worker',                true,  'send_email',        null);

  -- ── SC-482 Stage 6: Decision ──────────────────────────────

  insert into workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) values
    (v_482_s6, 1, 'Monitor application in ImmiAccount',                   true,  null,                null),
    (v_482_s6, 2, 'Respond to any DHA requests for further information',  false, null,                null),
    (v_482_s6, 3, 'Record grant date and visa expiry (2 or 4 years)',     true,  null,                null),
    (v_482_s6, 4, 'Record visa condition 8107 (must work for sponsor)',   true,  null,                null),
    (v_482_s6, 5, 'Send grant notification to worker and sponsor',        true,  'send_email',        null),
    (v_482_s6, 6, 'Update case status to granted',                        true,  null,                null),
    (v_482_s6, 7, 'Prompt final fee invoice',                             true,  'trust_entry',       null);

end $$;
