-- ============================================================
-- VisaDesk Comprehensive Seed Data
-- Workflow templates, case templates, and document types
-- for SC-500, SC-482, SC-820/801, SC-309/100, SC-485, SC-600
-- ============================================================

-- ============================================================
-- PART 1: WORKFLOW TEMPLATES
-- ============================================================

DO $$
DECLARE
  -- Template IDs
  v_tmpl_500  uuid := gen_random_uuid();
  v_tmpl_482  uuid := gen_random_uuid();
  v_tmpl_820  uuid := gen_random_uuid();
  v_tmpl_309  uuid := gen_random_uuid();
  v_tmpl_485  uuid := gen_random_uuid();
  v_tmpl_600  uuid := gen_random_uuid();

  -- SC-500 Stage IDs
  v_500_s1    uuid := gen_random_uuid();  -- Onboarding
  v_500_s2    uuid := gen_random_uuid();  -- Eligibility Assessment
  v_500_s3    uuid := gen_random_uuid();  -- Document Collection
  v_500_s4    uuid := gen_random_uuid();  -- Application Preparation
  v_500_s5    uuid := gen_random_uuid();  -- Lodgement
  v_500_s6    uuid := gen_random_uuid();  -- Post-Lodgement
  v_500_s7    uuid := gen_random_uuid();  -- Decision

  -- SC-482 Stage IDs
  v_482_s1    uuid := gen_random_uuid();  -- Onboarding
  v_482_s2    uuid := gen_random_uuid();  -- Sponsorship
  v_482_s3    uuid := gen_random_uuid();  -- Labour Market Testing
  v_482_s4    uuid := gen_random_uuid();  -- Nomination
  v_482_s5    uuid := gen_random_uuid();  -- Visa Application
  v_482_s6    uuid := gen_random_uuid();  -- Decision

  -- SC-820 Stage IDs
  v_820_s1    uuid := gen_random_uuid();  -- Onboarding
  v_820_s2    uuid := gen_random_uuid();  -- Sponsorship Assessment
  v_820_s3    uuid := gen_random_uuid();  -- Document Collection
  v_820_s4    uuid := gen_random_uuid();  -- Application Preparation
  v_820_s5    uuid := gen_random_uuid();  -- Lodgement
  v_820_s6    uuid := gen_random_uuid();  -- Bridging Visa Period
  v_820_s7    uuid := gen_random_uuid();  -- Decision

  -- SC-309 Stage IDs
  v_309_s1    uuid := gen_random_uuid();  -- Onboarding
  v_309_s2    uuid := gen_random_uuid();  -- Sponsorship Assessment
  v_309_s3    uuid := gen_random_uuid();  -- Document Collection
  v_309_s4    uuid := gen_random_uuid();  -- Application Preparation
  v_309_s5    uuid := gen_random_uuid();  -- Lodgement
  v_309_s6    uuid := gen_random_uuid();  -- Processing Period
  v_309_s7    uuid := gen_random_uuid();  -- Decision

  -- SC-485 Stage IDs
  v_485_s1    uuid := gen_random_uuid();  -- Onboarding
  v_485_s2    uuid := gen_random_uuid();  -- Eligibility Assessment
  v_485_s3    uuid := gen_random_uuid();  -- Document Collection
  v_485_s4    uuid := gen_random_uuid();  -- Application Preparation
  v_485_s5    uuid := gen_random_uuid();  -- Lodgement
  v_485_s6    uuid := gen_random_uuid();  -- Decision

  -- SC-600 Stage IDs
  v_600_s1    uuid := gen_random_uuid();  -- Onboarding
  v_600_s2    uuid := gen_random_uuid();  -- Document Collection
  v_600_s3    uuid := gen_random_uuid();  -- Application Preparation
  v_600_s4    uuid := gen_random_uuid();  -- Lodgement
  v_600_s5    uuid := gen_random_uuid();  -- Decision

BEGIN

  -- ============================================================
  -- Workflow Templates (firm_id = null = system defaults)
  -- ============================================================

  INSERT INTO workflow_templates (id, firm_id, visa_subclass, label, description) VALUES
    (v_tmpl_500, null, '500', 'Student Visa (Subclass 500)',
     'Workflow for student visa applications including Genuine Student assessment and CoE management.'),
    (v_tmpl_482, null, '482', 'Temporary Skill Shortage (Subclass 482)',
     'Workflow for TSS visa applications covering sponsorship, nomination, and visa stages.'),
    (v_tmpl_820, null, '820', 'Partner Visa Onshore (Subclass 820/801)',
     'Workflow for onshore partner visa applications from lodgement through to permanent residence.'),
    (v_tmpl_309, null, '309', 'Partner Visa Offshore (Subclass 309/100)',
     'Workflow for offshore partner visa applications including biometrics and overseas processing.'),
    (v_tmpl_485, null, '485', 'Temporary Graduate Visa (Subclass 485)',
     'Workflow for temporary graduate visa applications covering graduate work and post-study work streams.'),
    (v_tmpl_600, null, '600', 'Visitor Visa (Subclass 600)',
     'Workflow for visitor visa applications covering tourist, business visitor, and sponsored family streams.');

  -- ============================================================
  -- SC-500 Stages & Tasks
  -- ============================================================

  INSERT INTO workflow_stages (id, template_id, stage_order, label, icon) VALUES
    (v_500_s1, v_tmpl_500, 1, 'Onboarding',               'UserPlus'),
    (v_500_s2, v_tmpl_500, 2, 'Eligibility Assessment',    'ClipboardCheck'),
    (v_500_s3, v_tmpl_500, 3, 'Document Collection',       'FolderOpen'),
    (v_500_s4, v_tmpl_500, 4, 'Application Preparation',   'FileText'),
    (v_500_s5, v_tmpl_500, 5, 'Lodgement',                 'Send'),
    (v_500_s6, v_tmpl_500, 6, 'Post-Lodgement',            'Clock'),
    (v_500_s7, v_tmpl_500, 7, 'Decision',                  'CheckCircle');

  -- SC-500 Stage 1: Onboarding
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_500_s1, 1, 'Obtain signed client agreement and retainer',          true,  null,                null),
    (v_500_s1, 2, 'Collect passport and photo ID',                        true,  null,                null),
    (v_500_s1, 3, 'Explain OSHC insurance requirement',                   true,  null,                null),
    (v_500_s1, 4, 'Send client portal invite',                            true,  'send_portal_invite','client'),
    (v_500_s1, 5, 'Create case file and assign reference number',         true,  null,                null);

  -- SC-500 Stage 2: Eligibility Assessment
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_500_s2, 1, 'Assess Genuine Student (GS) criteria',                 true,  null,               null),
    (v_500_s2, 2, 'Confirm course enrolment and CoE details',             true,  null,               null),
    (v_500_s2, 3, 'Check English language requirement (IELTS/PTE/TOEFL)', true,  null,               null),
    (v_500_s2, 4, 'Assess financial capacity',                            true,  null,               null),
    (v_500_s2, 5, 'Check health and character requirements',              true,  null,               null),
    (v_500_s2, 6, 'Advise client on eligibility outcome',                 true,  'send_email',       null);

  -- SC-500 Stage 3: Document Collection
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_500_s3, 1, 'Request documents from client via portal',             true,  'document_request', 'client'),
    (v_500_s3, 2, 'Confirm CoE received from institution',                true,  null,               null),
    (v_500_s3, 3, 'Confirm OSHC policy document received',                true,  null,               null),
    (v_500_s3, 4, 'Confirm English test results received',                true,  null,               null),
    (v_500_s3, 5, 'Confirm financial evidence received',                  true,  null,               null),
    (v_500_s3, 6, 'Confirm health assessment booked',                     true,  'create_deadline',  null),
    (v_500_s3, 7, 'Confirm police clearances obtained',                   true,  null,               null);

  -- SC-500 Stage 4: Application Preparation
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_500_s4, 1, 'Prepare Form 157A student visa application',           true,  null,               null),
    (v_500_s4, 2, 'Prepare GS Statement with client',                     true,  null,               'client'),
    (v_500_s4, 3, 'Complete health examinations and obtain HAP ID',       true,  null,               null),
    (v_500_s4, 4, 'Conduct final document review',                        true,  null,               null),
    (v_500_s4, 5, 'Obtain client sign-off on application',                true,  'send_email',       null);

  -- SC-500 Stage 5: Lodgement
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_500_s5, 1, 'Lodge application via ImmiAccount',                    true,  null,               null),
    (v_500_s5, 2, 'Record TRN (Transaction Reference Number)',            true,  null,               null),
    (v_500_s5, 3, 'Log lodgement to communications',                      true,  'system_note',      null),
    (v_500_s5, 4, 'Set bridging visa expiry deadline',                    true,  'create_deadline',  null),
    (v_500_s5, 5, 'Send lodgement confirmation to client',                true,  'send_email',       null);

  -- SC-500 Stage 6: Post-Lodgement
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_500_s6, 1, 'Monitor application status in ImmiAccount',            true,  null,               null),
    (v_500_s6, 2, 'Respond to any DHA requests for further information',  false, null,               null),
    (v_500_s6, 3, 'Log health and character clearances as received',      false, null,               null),
    (v_500_s6, 4, 'Monitor processing times',                             false, null,               null);

  -- SC-500 Stage 7: Decision
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_500_s7, 1, 'Record grant date and visa expiry',                    true,  null,               null),
    (v_500_s7, 2, 'Send grant notification to client',                    true,  'send_email',       null),
    (v_500_s7, 3, 'Record visa conditions (8105, 8202)',                  true,  null,               null),
    (v_500_s7, 4, 'Update case status to granted',                        true,  null,               null),
    (v_500_s7, 5, 'Archive case documents',                               true,  null,               null),
    (v_500_s7, 6, 'Prompt final fee invoice',                             true,  'trust_entry',      null);

  -- ============================================================
  -- SC-482 Stages & Tasks
  -- ============================================================

  INSERT INTO workflow_stages (id, template_id, stage_order, label, icon) VALUES
    (v_482_s1, v_tmpl_482, 1, 'Onboarding',               'UserPlus'),
    (v_482_s2, v_tmpl_482, 2, 'Sponsorship',               'Building2'),
    (v_482_s3, v_tmpl_482, 3, 'Labour Market Testing',     'Search'),
    (v_482_s4, v_tmpl_482, 4, 'Nomination',                'Briefcase'),
    (v_482_s5, v_tmpl_482, 5, 'Visa Application',          'FileText'),
    (v_482_s6, v_tmpl_482, 6, 'Decision',                  'CheckCircle');

  -- SC-482 Stage 1: Onboarding
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_482_s1, 1, 'Obtain signed engagement letter from employer',        true,  null,                null),
    (v_482_s1, 2, 'Obtain signed engagement letter from worker',          true,  null,                null),
    (v_482_s1, 3, 'Confirm position details and ANZSCO code',             true,  null,                null),
    (v_482_s1, 4, 'Confirm salary meets TSMIT ($73,150)',                 true,  null,                null),
    (v_482_s1, 5, 'Check worker passport and current visa status',        true,  null,                null),
    (v_482_s1, 6, 'Send sponsor portal invite',                           true,  'send_portal_invite','sponsor'),
    (v_482_s1, 7, 'Send client portal invite to worker',                  true,  'send_portal_invite','client');

  -- SC-482 Stage 2: Sponsorship
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_482_s2, 1, 'Confirm sponsor SBS status via DOHA',                  true,  null,                null),
    (v_482_s2, 2, 'If SBS not current, lodge Standard Business Sponsorship', false, null,             null),
    (v_482_s2, 3, 'Upload sponsor financial documents',                   true,  null,                'sponsor'),
    (v_482_s2, 4, 'Upload training record evidence',                      true,  null,                'sponsor'),
    (v_482_s2, 5, 'Set SBS decision deadline',                            true,  'create_deadline',   null),
    (v_482_s2, 6, 'Record SBS approval and expiry date',                  true,  null,                null);

  -- SC-482 Stage 3: Labour Market Testing
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_482_s3, 1, 'Confirm LMT exemption applies (FTA country or earnings above threshold)', false, null, null),
    (v_482_s3, 2, 'If LMT required, confirm job ads placed on Seek and LinkedIn',            false, null, null),
    (v_482_s3, 3, 'Collect copies of all job advertisements',             false, null,                null),
    (v_482_s3, 4, 'Collect records of Australian applicant rejections',   false, null,                null),
    (v_482_s3, 5, 'Confirm 4-week advertising period completed',          false, 'create_deadline',   null),
    (v_482_s3, 6, 'Prepare LMT summary document',                         false, null,                null);

  -- SC-482 Stage 4: Nomination
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_482_s4, 1, 'Prepare nomination application Form 1395',             true,  null,                null),
    (v_482_s4, 2, 'Confirm position description completed by sponsor',    true,  null,                'sponsor'),
    (v_482_s4, 3, 'Upload all nomination supporting documents',           true,  null,                null),
    (v_482_s4, 4, 'Confirm salary and TSMIT confirmed in writing',        true,  null,                null),
    (v_482_s4, 5, 'Lodge nomination via ImmiAccount',                     true,  null,                null),
    (v_482_s4, 6, 'Record nomination TRN',                                true,  'system_note',       null),
    (v_482_s4, 7, 'Set nomination decision deadline',                     true,  'create_deadline',   null),
    (v_482_s4, 8, 'Notify worker of nomination lodgement',                true,  'send_email',        null);

  -- SC-482 Stage 5: Visa Application
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_482_s5, 1, 'Confirm approved nomination received',                 true,  null,                null),
    (v_482_s5, 2, 'Request outstanding visa documents from worker',       true,  'document_request',  'client'),
    (v_482_s5, 3, 'Confirm health assessments booked',                    true,  'create_deadline',   null),
    (v_482_s5, 4, 'Confirm skills assessment obtained if required',       false, null,                null),
    (v_482_s5, 5, 'Confirm English language evidence obtained',           true,  null,                null),
    (v_482_s5, 6, 'Prepare visa application Form 1066',                   true,  null,                null),
    (v_482_s5, 7, 'Lodge visa application via ImmiAccount',               true,  null,                null),
    (v_482_s5, 8, 'Record visa application TRN',                          true,  'system_note',       null),
    (v_482_s5, 9, 'Send lodgement confirmation to worker',                true,  'send_email',        null);

  -- SC-482 Stage 6: Decision
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_482_s6, 1, 'Monitor application in ImmiAccount',                   true,  null,                null),
    (v_482_s6, 2, 'Respond to any DHA requests for further information',  false, null,                null),
    (v_482_s6, 3, 'Record grant date and visa expiry (2 or 4 years)',     true,  null,                null),
    (v_482_s6, 4, 'Record visa condition 8107 (must work for sponsor)',   true,  null,                null),
    (v_482_s6, 5, 'Send grant notification to worker and sponsor',        true,  'send_email',        null),
    (v_482_s6, 6, 'Update case status to granted',                        true,  null,                null),
    (v_482_s6, 7, 'Prompt final fee invoice',                             true,  'trust_entry',       null);

  -- ============================================================
  -- SC-820/801 Stages & Tasks
  -- ============================================================

  INSERT INTO workflow_stages (id, template_id, stage_order, label, icon) VALUES
    (v_820_s1, v_tmpl_820, 1, 'Onboarding',               'UserPlus'),
    (v_820_s2, v_tmpl_820, 2, 'Sponsorship Assessment',   'Heart'),
    (v_820_s3, v_tmpl_820, 3, 'Document Collection',      'FolderOpen'),
    (v_820_s4, v_tmpl_820, 4, 'Application Preparation',  'FileText'),
    (v_820_s5, v_tmpl_820, 5, 'Lodgement',                'Send'),
    (v_820_s6, v_tmpl_820, 6, 'Bridging Visa Period',     'Clock'),
    (v_820_s7, v_tmpl_820, 7, 'Decision',                 'CheckCircle');

  -- SC-820 Stage 1: Onboarding
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_820_s1, 1, 'Obtain signed client agreement and retainer',          true,  null,                null),
    (v_820_s1, 2, 'Confirm sponsor citizenship/permanent residency',      true,  null,                null),
    (v_820_s1, 3, 'Confirm relationship type (married or de facto)',      true,  null,                null),
    (v_820_s1, 4, 'Collect passports for applicant and sponsor',         true,  null,                null),
    (v_820_s1, 5, 'Send client portal invite',                            true,  'send_portal_invite','client'),
    (v_820_s1, 6, 'Explain concurrent SC-820/801 process',               true,  null,                null);

  -- SC-820 Stage 2: Sponsorship Assessment
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_820_s2, 1, 'Assess sponsor eligibility (citizen/PR/eligible NZ)',  true,  null,                null),
    (v_820_s2, 2, 'Check sponsor not prohibited from sponsoring',         true,  null,                null),
    (v_820_s2, 3, 'Check sponsor no previous partner visa refusals',      true,  null,                null),
    (v_820_s2, 4, 'Confirm sponsor meets limitations on number of sponsorships', true, null,          null),
    (v_820_s2, 5, 'Assess genuine relationship evidence',                 true,  null,                null);

  -- SC-820 Stage 3: Document Collection
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_820_s3, 1, 'Request all documents via client portal',              true,  'document_request',  'client'),
    (v_820_s3, 2, 'Collect evidence of financial aspects of relationship',true,  null,                null),
    (v_820_s3, 3, 'Collect evidence of household aspects',                true,  null,                null),
    (v_820_s3, 4, 'Collect evidence of social aspects',                   true,  null,                null),
    (v_820_s3, 5, 'Collect evidence of commitment',                       true,  null,                null),
    (v_820_s3, 6, 'Obtain Form 888 from two statutory witnesses',         true,  null,                null),
    (v_820_s3, 7, 'Book health assessments via HAP',                      true,  'create_deadline',   null),
    (v_820_s3, 8, 'Obtain police clearances for all required countries',  true,  null,                null);

  -- SC-820 Stage 4: Application Preparation
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_820_s4, 1, 'Prepare sponsorship Form 40SP',                        true,  null,                null),
    (v_820_s4, 2, 'Prepare visa application Form 47SP',                   true,  null,                null),
    (v_820_s4, 3, 'Draft relationship statement for applicant',           true,  null,                'client'),
    (v_820_s4, 4, 'Draft relationship statement for sponsor',             true,  null,                null),
    (v_820_s4, 5, 'Conduct final document review',                        true,  null,                null),
    (v_820_s4, 6, 'Obtain client and sponsor sign-off',                   true,  'send_email',        null);

  -- SC-820 Stage 5: Lodgement
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_820_s5, 1, 'Lodge SC-820 visa application and SC-309 sponsorship via ImmiAccount', true, null, null),
    (v_820_s5, 2, 'Record TRN for both sponsorship and visa application', true,  null,                null),
    (v_820_s5, 3, 'Log lodgement to communications',                      true,  'system_note',       null),
    (v_820_s5, 4, 'Set bridging visa expiry deadline (BVA)',              true,  'create_deadline',   null),
    (v_820_s5, 5, 'Send lodgement confirmation to client and sponsor',    true,  'send_email',        null);

  -- SC-820 Stage 6: Bridging Visa Period
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_820_s6, 1, 'Monitor application status in ImmiAccount',            true,  null,                null),
    (v_820_s6, 2, 'Respond to any DHA requests for further information',  false, null,                null),
    (v_820_s6, 3, 'Monitor 2-year waiting period for SC-801',             true,  'create_deadline',   null),
    (v_820_s6, 4, 'Check health and character clearances as received',    false, null,                null),
    (v_820_s6, 5, 'Update relationship evidence at SC-801 stage if required', false, null,            null);

  -- SC-820 Stage 7: Decision
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_820_s7, 1, 'Record grant date and visa (SC-820 or SC-801)',        true,  null,                null),
    (v_820_s7, 2, 'Send grant notification to client',                    true,  'send_email',        null),
    (v_820_s7, 3, 'Record visa conditions (no condition 8503)',           true,  null,                null),
    (v_820_s7, 4, 'Update case status to granted',                        true,  null,                null),
    (v_820_s7, 5, 'Archive case documents',                               true,  null,                null),
    (v_820_s7, 6, 'Prompt final fee invoice',                             true,  'trust_entry',       null);

  -- ============================================================
  -- SC-309/100 Stages & Tasks
  -- ============================================================

  INSERT INTO workflow_stages (id, template_id, stage_order, label, icon) VALUES
    (v_309_s1, v_tmpl_309, 1, 'Onboarding',               'UserPlus'),
    (v_309_s2, v_tmpl_309, 2, 'Sponsorship Assessment',   'Heart'),
    (v_309_s3, v_tmpl_309, 3, 'Document Collection',      'FolderOpen'),
    (v_309_s4, v_tmpl_309, 4, 'Application Preparation',  'FileText'),
    (v_309_s5, v_tmpl_309, 5, 'Lodgement',                'Send'),
    (v_309_s6, v_tmpl_309, 6, 'Processing Period',        'Clock'),
    (v_309_s7, v_tmpl_309, 7, 'Decision',                 'CheckCircle');

  -- SC-309 Stage 1: Onboarding
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_309_s1, 1, 'Obtain signed client agreement and retainer',          true,  null,                null),
    (v_309_s1, 2, 'Confirm Australian sponsor citizenship/PR status',     true,  null,                null),
    (v_309_s1, 3, 'Confirm relationship type (married or de facto)',      true,  null,                null),
    (v_309_s1, 4, 'Collect passports for applicant and sponsor',         true,  null,                null),
    (v_309_s1, 5, 'Confirm applicant location outside Australia',        true,  null,                null),
    (v_309_s1, 6, 'Send client portal invite',                            true,  'send_portal_invite','client'),
    (v_309_s1, 7, 'Explain concurrent SC-309/100 process and timeline',  true,  null,                null);

  -- SC-309 Stage 2: Sponsorship Assessment
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_309_s2, 1, 'Assess sponsor eligibility (citizen/PR/eligible NZ)', true,  null,                null),
    (v_309_s2, 2, 'Check sponsor not prohibited from sponsoring',         true,  null,                null),
    (v_309_s2, 3, 'Check sponsor has no previous partner visa limitations',true, null,                null),
    (v_309_s2, 4, 'Assess genuine relationship evidence',                 true,  null,                null),
    (v_309_s2, 5, 'Advise sponsor of obligations',                        true,  'send_email',        null);

  -- SC-309 Stage 3: Document Collection
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_309_s3, 1, 'Request all documents via client portal',              true,  'document_request',  'client'),
    (v_309_s3, 2, 'Collect evidence of financial aspects of relationship',true,  null,                null),
    (v_309_s3, 3, 'Collect evidence of household aspects',                true,  null,                null),
    (v_309_s3, 4, 'Collect evidence of social aspects',                   true,  null,                null),
    (v_309_s3, 5, 'Collect evidence of commitment',                       true,  null,                null),
    (v_309_s3, 6, 'Obtain Form 888 from two statutory witnesses',         true,  null,                null),
    (v_309_s3, 7, 'Arrange overseas health assessments via HAP',          true,  'create_deadline',   null),
    (v_309_s3, 8, 'Obtain police clearances for all required countries',  true,  null,                null),
    (v_309_s3, 9, 'Arrange biometrics collection if required',            true,  null,                null);

  -- SC-309 Stage 4: Application Preparation
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_309_s4, 1, 'Prepare sponsorship Form 40SP',                        true,  null,                null),
    (v_309_s4, 2, 'Prepare visa application Form 47SP',                   true,  null,                null),
    (v_309_s4, 3, 'Draft relationship statement for applicant',           true,  null,                'client'),
    (v_309_s4, 4, 'Draft relationship statement for sponsor',             true,  null,                null),
    (v_309_s4, 5, 'Conduct final document review',                        true,  null,                null),
    (v_309_s4, 6, 'Obtain client and sponsor sign-off',                   true,  'send_email',        null);

  -- SC-309 Stage 5: Lodgement
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_309_s5, 1, 'Lodge SC-309 visa application and sponsorship via ImmiAccount', true, null,        null),
    (v_309_s5, 2, 'Record TRN for both sponsorship and visa application', true,  null,                null),
    (v_309_s5, 3, 'Log lodgement to communications',                      true,  'system_note',       null),
    (v_309_s5, 4, 'Send lodgement confirmation to client and sponsor',    true,  'send_email',        null),
    (v_309_s5, 5, 'Advise client of visa application acknowledgement (VAC) payment', true, null,      null);

  -- SC-309 Stage 6: Processing Period
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_309_s6, 1, 'Monitor application status in ImmiAccount',            true,  null,                null),
    (v_309_s6, 2, 'Respond to any DHA requests for further information',  false, null,                null),
    (v_309_s6, 3, 'Monitor 2-year waiting period for SC-100 (permanent)', true,  'create_deadline',   null),
    (v_309_s6, 4, 'Check health and character clearances as received',    false, null,                null),
    (v_309_s6, 5, 'Provide updated evidence at SC-100 stage if required', false, null,                null);

  -- SC-309 Stage 7: Decision
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_309_s7, 1, 'Record grant date and visa (SC-309 or SC-100)',        true,  null,                null),
    (v_309_s7, 2, 'Send grant notification to client',                    true,  'send_email',        null),
    (v_309_s7, 3, 'Record entry requirements and visa conditions',        true,  null,                null),
    (v_309_s7, 4, 'Advise client to activate visa by entering Australia', true,  null,                null),
    (v_309_s7, 5, 'Update case status to granted',                        true,  null,                null),
    (v_309_s7, 6, 'Archive case documents',                               true,  null,                null),
    (v_309_s7, 7, 'Prompt final fee invoice',                             true,  'trust_entry',       null);

  -- ============================================================
  -- SC-485 Stages & Tasks
  -- ============================================================

  INSERT INTO workflow_stages (id, template_id, stage_order, label, icon) VALUES
    (v_485_s1, v_tmpl_485, 1, 'Onboarding',               'UserPlus'),
    (v_485_s2, v_tmpl_485, 2, 'Eligibility Assessment',   'ClipboardCheck'),
    (v_485_s3, v_tmpl_485, 3, 'Document Collection',      'FolderOpen'),
    (v_485_s4, v_tmpl_485, 4, 'Application Preparation',  'FileText'),
    (v_485_s5, v_tmpl_485, 5, 'Lodgement',                'Send'),
    (v_485_s6, v_tmpl_485, 6, 'Decision',                 'CheckCircle');

  -- SC-485 Stage 1: Onboarding
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_485_s1, 1, 'Obtain signed client agreement and retainer',          true,  null,                null),
    (v_485_s1, 2, 'Collect passport and current visa details',            true,  null,                null),
    (v_485_s1, 3, 'Confirm stream (Graduate Work or Post-Study Work)',    true,  null,                null),
    (v_485_s1, 4, 'Send client portal invite',                            true,  'send_portal_invite','client'),
    (v_485_s1, 5, 'Create case file and assign reference number',         true,  null,                null);

  -- SC-485 Stage 2: Eligibility Assessment
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_485_s2, 1, 'Confirm recent graduate (within 6 months of course completion)', true, null,       null),
    (v_485_s2, 2, 'Confirm study completed at CRICOS-registered provider in Australia', true, null,   null),
    (v_485_s2, 3, 'Confirm at least 2 years full-time study in Australia',true, null,                 null),
    (v_485_s2, 4, 'Check English language requirement (IELTS/PTE 6.0)',  true,  null,                 null),
    (v_485_s2, 5, 'For Graduate Work stream: confirm occupation on relevant list', false, null,       null),
    (v_485_s2, 6, 'Check health and character requirements',              true,  null,                 null),
    (v_485_s2, 7, 'Advise client on eligibility outcome',                 true,  'send_email',        null);

  -- SC-485 Stage 3: Document Collection
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_485_s3, 1, 'Request documents from client via portal',             true,  'document_request',  'client'),
    (v_485_s3, 2, 'Confirm academic transcripts received',                true,  null,                null),
    (v_485_s3, 3, 'Confirm qualification/degree certificate received',    true,  null,                null),
    (v_485_s3, 4, 'Confirm English test results received (6.0 overall)',  true,  null,                null),
    (v_485_s3, 5, 'Confirm skills assessment received (Graduate Work stream)', false, null,           null),
    (v_485_s3, 6, 'Book health assessment via HAP',                       true,  'create_deadline',   null),
    (v_485_s3, 7, 'Confirm police clearances obtained',                   true,  null,                null);

  -- SC-485 Stage 4: Application Preparation
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_485_s4, 1, 'Prepare Form 1066 visa application',                   true,  null,                null),
    (v_485_s4, 2, 'Complete health examinations and obtain HAP ID',       true,  null,                null),
    (v_485_s4, 3, 'Conduct final document review',                        true,  null,                null),
    (v_485_s4, 4, 'Obtain client sign-off on application',                true,  'send_email',        null);

  -- SC-485 Stage 5: Lodgement
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_485_s5, 1, 'Lodge application via ImmiAccount',                    true,  null,                null),
    (v_485_s5, 2, 'Record TRN',                                           true,  null,                null),
    (v_485_s5, 3, 'Log lodgement to communications',                      true,  'system_note',       null),
    (v_485_s5, 4, 'Set bridging visa expiry deadline',                    true,  'create_deadline',   null),
    (v_485_s5, 5, 'Send lodgement confirmation to client',                true,  'send_email',        null);

  -- SC-485 Stage 6: Decision
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_485_s6, 1, 'Monitor application status in ImmiAccount',            true,  null,                null),
    (v_485_s6, 2, 'Respond to any DHA requests for further information',  false, null,                null),
    (v_485_s6, 3, 'Record grant date and visa expiry (2 or 4 years)',     true,  null,                null),
    (v_485_s6, 4, 'Record visa conditions (8104, 8105)',                  true,  null,                null),
    (v_485_s6, 5, 'Send grant notification to client',                    true,  'send_email',        null),
    (v_485_s6, 6, 'Update case status to granted',                        true,  null,                null),
    (v_485_s6, 7, 'Archive case documents',                               true,  null,                null),
    (v_485_s6, 8, 'Prompt final fee invoice',                             true,  'trust_entry',       null);

  -- ============================================================
  -- SC-600 Stages & Tasks
  -- ============================================================

  INSERT INTO workflow_stages (id, template_id, stage_order, label, icon) VALUES
    (v_600_s1, v_tmpl_600, 1, 'Onboarding',               'UserPlus'),
    (v_600_s2, v_tmpl_600, 2, 'Document Collection',      'FolderOpen'),
    (v_600_s3, v_tmpl_600, 3, 'Application Preparation',  'FileText'),
    (v_600_s4, v_tmpl_600, 4, 'Lodgement',                'Send'),
    (v_600_s5, v_tmpl_600, 5, 'Decision',                 'CheckCircle');

  -- SC-600 Stage 1: Onboarding
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_600_s1, 1, 'Obtain signed client agreement',                       true,  null,                null),
    (v_600_s1, 2, 'Confirm visa stream (Tourist, Business, Sponsored Family)', true, null,            null),
    (v_600_s1, 3, 'Collect passport and identity documents',              true,  null,                null),
    (v_600_s1, 4, 'Confirm intended travel dates and duration',           true,  null,                null),
    (v_600_s1, 5, 'Send client portal invite',                            true,  'send_portal_invite','client');

  -- SC-600 Stage 2: Document Collection
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_600_s2, 1, 'Request documents from client via portal',             true,  'document_request',  'client'),
    (v_600_s2, 2, 'Confirm passport validity (6 months beyond stay)',     true,  null,                null),
    (v_600_s2, 3, 'Collect financial evidence (bank statements)',         true,  null,                null),
    (v_600_s2, 4, 'Collect evidence of ties to home country',             true,  null,                null),
    (v_600_s2, 5, 'Collect travel itinerary and purpose of visit',       true,  null,                null),
    (v_600_s2, 6, 'If Sponsored Family: collect Form 1163 from sponsor', false, null,                null),
    (v_600_s2, 7, 'Confirm health insurance if required',                 false, null,                null);

  -- SC-600 Stage 3: Application Preparation
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_600_s3, 1, 'Complete online visitor visa application',             true,  null,                null),
    (v_600_s3, 2, 'Confirm no condition 8503 on previous visa',           true,  null,                null),
    (v_600_s3, 3, 'Conduct final document review',                        true,  null,                null),
    (v_600_s3, 4, 'Obtain client sign-off on application',                true,  'send_email',        null);

  -- SC-600 Stage 4: Lodgement
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_600_s4, 1, 'Lodge application via ImmiAccount',                    true,  null,                null),
    (v_600_s4, 2, 'Record TRN',                                           true,  null,                null),
    (v_600_s4, 3, 'Log lodgement to communications',                      true,  'system_note',       null),
    (v_600_s4, 4, 'Send lodgement confirmation to client',                true,  'send_email',        null);

  -- SC-600 Stage 5: Decision
  INSERT INTO workflow_tasks (stage_id, task_order, label, is_required, trigger_type, requires_portal) VALUES
    (v_600_s5, 1, 'Monitor application status in ImmiAccount',            true,  null,                null),
    (v_600_s5, 2, 'Respond to any DHA requests for further information',  false, null,                null),
    (v_600_s5, 3, 'Record grant date and visa conditions',                true,  null,                null),
    (v_600_s5, 4, 'Record stay period and any condition 8101/8201',       true,  null,                null),
    (v_600_s5, 5, 'Send grant notification to client',                    true,  'send_email',        null),
    (v_600_s5, 6, 'Update case status to granted',                        true,  null,                null),
    (v_600_s5, 7, 'Prompt final fee invoice',                             true,  'trust_entry',       null);

END $$;

-- ============================================================
-- PART 2: CASE TEMPLATES
-- ============================================================

DO $$
DECLARE
  -- Case Template IDs
  v_ct_500    uuid := gen_random_uuid();
  v_ct_482    uuid := gen_random_uuid();
  v_ct_820    uuid := gen_random_uuid();
  v_ct_309    uuid := gen_random_uuid();
  v_ct_485    uuid := gen_random_uuid();
  v_ct_600    uuid := gen_random_uuid();

  -- SC-500 Section IDs
  v_500_s1    uuid := gen_random_uuid();  -- Course Details
  v_500_s2    uuid := gen_random_uuid();  -- Enrolment
  v_500_s3    uuid := gen_random_uuid();  -- OSHC
  v_500_s4    uuid := gen_random_uuid();  -- English Evidence
  v_500_s5    uuid := gen_random_uuid();  -- Financial Capacity
  v_500_s6    uuid := gen_random_uuid();  -- Visa History

  -- SC-482 Section IDs
  v_482_s1    uuid := gen_random_uuid();  -- Nomination Details
  v_482_s2    uuid := gen_random_uuid();  -- Salary and TSMIT
  v_482_s3    uuid := gen_random_uuid();  -- Sponsorship
  v_482_s4    uuid := gen_random_uuid();  -- Labour Market Testing
  v_482_s5    uuid := gen_random_uuid();  -- Worker Details
  v_482_s6    uuid := gen_random_uuid();  -- Key Dates

  -- SC-820 Section IDs
  v_820_s1    uuid := gen_random_uuid();  -- Sponsor Details
  v_820_s2    uuid := gen_random_uuid();  -- Relationship Timeline
  v_820_s3    uuid := gen_random_uuid();  -- Financial Aspects
  v_820_s4    uuid := gen_random_uuid();  -- Household Aspects
  v_820_s5    uuid := gen_random_uuid();  -- Social Aspects
  v_820_s6    uuid := gen_random_uuid();  -- Commitment Evidence
  v_820_s7    uuid := gen_random_uuid();  -- Form 888 Witnesses
  v_820_s8    uuid := gen_random_uuid();  -- Visa History

  -- SC-309 Section IDs
  v_309_s1    uuid := gen_random_uuid();  -- Sponsor Details
  v_309_s2    uuid := gen_random_uuid();  -- Relationship Timeline
  v_309_s3    uuid := gen_random_uuid();  -- Financial Aspects
  v_309_s4    uuid := gen_random_uuid();  -- Social Aspects
  v_309_s5    uuid := gen_random_uuid();  -- Commitment Evidence
  v_309_s6    uuid := gen_random_uuid();  -- Form 888 Witnesses
  v_309_s7    uuid := gen_random_uuid();  -- Applicant Location & Entry
  v_309_s8    uuid := gen_random_uuid();  -- Visa History

  -- SC-485 Section IDs
  v_485_s1    uuid := gen_random_uuid();  -- Course Details
  v_485_s2    uuid := gen_random_uuid();  -- Graduation Details
  v_485_s3    uuid := gen_random_uuid();  -- English Evidence
  v_485_s4    uuid := gen_random_uuid();  -- Skills Assessment
  v_485_s5    uuid := gen_random_uuid();  -- Visa History

  -- SC-600 Section IDs
  v_600_s1    uuid := gen_random_uuid();  -- Travel Details
  v_600_s2    uuid := gen_random_uuid();  -- Financial Evidence
  v_600_s3    uuid := gen_random_uuid();  -- Ties to Home Country
  v_600_s4    uuid := gen_random_uuid();  -- Sponsor Details (if applicable)
  v_600_s5    uuid := gen_random_uuid();  -- Visa History

BEGIN

  -- ============================================================
  -- Insert Case Templates
  -- ============================================================

  INSERT INTO case_templates (id, firm_id, visa_subclass, name, is_system_default) VALUES
    (v_ct_500, null, '500', 'Student Visa (SC-500)',              true),
    (v_ct_482, null, '482', 'Temporary Skill Shortage (SC-482)', true),
    (v_ct_820, null, '820', 'Partner Visa Onshore (SC-820/801)', true),
    (v_ct_309, null, '309', 'Partner Visa Offshore (SC-309/100)',true),
    (v_ct_485, null, '485', 'Temporary Graduate Visa (SC-485)',  true),
    (v_ct_600, null, '600', 'Visitor Visa (SC-600)',             true);

  -- ============================================================
  -- SC-500 Sections & Fields
  -- ============================================================

  INSERT INTO case_template_sections (id, template_id, title, section_key, display_order) VALUES
    (v_500_s1, v_ct_500, 'Course Details',     'course_details',     1),
    (v_500_s2, v_ct_500, 'Enrolment',          'enrolment',          2),
    (v_500_s3, v_ct_500, 'OSHC',               'oshc',               3),
    (v_500_s4, v_ct_500, 'English Evidence',   'english_evidence',   4),
    (v_500_s5, v_ct_500, 'Financial Capacity', 'financial_capacity', 5),
    (v_500_s6, v_ct_500, 'Visa History',       'visa_history',       6);

  -- SC-500: Course Details
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, placeholder, options, display_order) VALUES
    (v_ct_500, v_500_s1, 'course_name',        'Course Name',        'text',   true,  null, null, 1),
    (v_ct_500, v_500_s1, 'education_provider', 'Education Provider', 'text',   true,  null, null, 2),
    (v_ct_500, v_500_s1, 'campus_location',    'Campus Location',    'text',   false, null, null, 3),
    (v_ct_500, v_500_s1, 'course_level',       'Course Level',       'select', false, null,
      '["Certificate","Diploma","Bachelor","Graduate Certificate","Graduate Diploma","Masters","PhD","ELICOS","Foundation"]'::jsonb, 4),
    (v_ct_500, v_500_s1, 'course_start_date',  'Course Start Date',  'date',   true,  null, null, 5),
    (v_ct_500, v_500_s1, 'course_end_date',    'Course End Date',    'date',   true,  null, null, 6);

  -- SC-500: Enrolment
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, help_text, display_order) VALUES
    (v_ct_500, v_500_s2, 'coe_number',           'CoE Number',           'text',  false, 'Confirmation of Enrolment number from provider', 1),
    (v_ct_500, v_500_s2, 'coe_issue_date',        'CoE Issue Date',       'date',  false, null, 2),
    (v_ct_500, v_500_s2, 'coe_expiry_date',       'CoE Expiry Date',      'date',  false, null, 3),
    (v_ct_500, v_500_s2, 'provider_cricos_code',  'Provider CRICOS Code', 'text',  false, null, 4);

  -- SC-500: OSHC
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_500, v_500_s3, 'oshc_provider',       'OSHC Provider',     'text',  false, 1),
    (v_ct_500, v_500_s3, 'oshc_policy_number',  'Policy Number',     'text',  false, 2),
    (v_ct_500, v_500_s3, 'oshc_start_date',     'OSHC Start Date',   'date',  false, 3),
    (v_ct_500, v_500_s3, 'oshc_end_date',       'OSHC End Date',     'date',  false, 4);

  -- SC-500: English Evidence
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_500, v_500_s4, 'english_test_type',    'Test Type', 'select', false,
      '["IELTS","PTE Academic","TOEFL iBT","Cambridge C1","OET","Exempt"]'::jsonb, 1);
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_500, v_500_s4, 'english_test_date',    'Test Date',       'date', false, 2),
    (v_ct_500, v_500_s4, 'english_overall_score','Overall Score',   'text', false, 3),
    (v_ct_500, v_500_s4, 'english_listening',    'Listening',       'text', false, 4),
    (v_ct_500, v_500_s4, 'english_reading',      'Reading',         'text', false, 5),
    (v_ct_500, v_500_s4, 'english_writing',      'Writing',         'text', false, 6),
    (v_ct_500, v_500_s4, 'english_speaking',     'Speaking',        'text', false, 7);

  -- SC-500: Financial Capacity
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, help_text, display_order) VALUES
    (v_ct_500, v_500_s5, 'funds_available',              'Funds Available',        'currency', false, 'Living cost requirement: AUD $29,710/year', 1),
    (v_ct_500, v_500_s5, 'financial_sponsor_name',       'Sponsor Name',           'text',     false, null, 2),
    (v_ct_500, v_500_s5, 'financial_sponsor_relationship','Sponsor Relationship',  'text',     false, null, 3),
    (v_ct_500, v_500_s5, 'funds_source',                 'Source of Funds',        'textarea', false, null, 4);

  -- SC-500: Visa History
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_500, v_500_s6, 'previous_australian_visas', 'Previous Australian Visas', 'textarea', false, 1),
    (v_ct_500, v_500_s6, 'previous_visa_refusals',    'Previous Visa Refusals',    'checkbox', false, 2),
    (v_ct_500, v_500_s6, 'refusal_details',           'Refusal Details',           'textarea', false, 3),
    (v_ct_500, v_500_s6, 'current_visa_subclass',     'Current Visa Subclass',     'text',     false, 4),
    (v_ct_500, v_500_s6, 'current_visa_expiry',       'Current Visa Expiry',       'date',     false, 5);

  -- ============================================================
  -- SC-482 Sections & Fields
  -- ============================================================

  INSERT INTO case_template_sections (id, template_id, title, section_key, display_order) VALUES
    (v_482_s1, v_ct_482, 'Nomination Details',      'nomination_details',    1),
    (v_482_s2, v_ct_482, 'Salary and TSMIT',        'salary_tsmit',          2),
    (v_482_s3, v_ct_482, 'Sponsorship',             'sponsorship',           3),
    (v_482_s4, v_ct_482, 'Labour Market Testing',   'labour_market_testing', 4),
    (v_482_s5, v_ct_482, 'Worker Details',          'worker_details',        5),
    (v_482_s6, v_ct_482, 'Key Dates',               'key_dates',             6);

  -- SC-482: Nomination Details
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, help_text, options, display_order) VALUES
    (v_ct_482, v_482_s1, 'nominated_position', 'Nominated Position', 'text',   true,  null, null, 1),
    (v_ct_482, v_482_s1, 'anzsco_code',        'ANZSCO Code',        'text',   true,  '6-digit ANZSCO occupation code', null, 2),
    (v_ct_482, v_482_s1, 'anzsco_title',       'ANZSCO Title',       'text',   false, null, null, 3),
    (v_ct_482, v_482_s1, 'employment_type',    'Employment Type',    'select', false, null, '["Full-time","Part-time"]'::jsonb, 4),
    (v_ct_482, v_482_s1, 'work_location',      'Work Location',      'text',   true,  null, null, 5),
    (v_ct_482, v_482_s1, 'visa_stream',        'Visa Stream',        'select', false, null, '["Short-term","Medium-term","Labour Agreement"]'::jsonb, 6);

  -- SC-482: Salary and TSMIT
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, help_text, display_order) VALUES
    (v_ct_482, v_482_s2, 'salary_amount',           'Salary Amount',          'currency', true,  'Must meet TSMIT — currently $73,150', 1),
    (v_ct_482, v_482_s2, 'salary_includes_super',   'Salary Includes Super',  'checkbox', false, null, 2),
    (v_ct_482, v_482_s2, 'amsr_amount',             'AMSR Amount',            'currency', false, null, 3),
    (v_ct_482, v_482_s2, 'market_salary_evidence',  'Market Salary Evidence', 'textarea', false, null, 4);

  -- SC-482: Sponsorship
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_482, v_482_s3, 'sbs_status',          'SBS Status',         'select',   true,  '["Not Applied","Pending","Approved","Expired"]'::jsonb, 1),
    (v_ct_482, v_482_s3, 'sbs_approval_date',   'SBS Approval Date',  'date',     false, null, 2),
    (v_ct_482, v_482_s3, 'sbs_expiry_date',     'SBS Expiry Date',    'date',     false, null, 3),
    (v_ct_482, v_482_s3, 'sponsorship_obligations_acknowledged', 'Obligations Acknowledged', 'checkbox', false, null, 4);

  -- SC-482: Labour Market Testing
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_482, v_482_s4, 'lmt_required',       'LMT Required',       'checkbox',     false, null, 1),
    (v_ct_482, v_482_s4, 'lmt_exempt_reason',  'LMT Exempt Reason',  'select',       false,
      '["FTA country — New Zealand","FTA country — Chile","FTA country — Korea","FTA country — Japan","FTA country — China","FTA country — ASEAN","Earnings above LMT threshold","International trade obligation","Other"]'::jsonb, 2),
    (v_ct_482, v_482_s4, 'lmt_start_date',     'LMT Start Date',     'date',         false, null, 3),
    (v_ct_482, v_482_s4, 'lmt_end_date',       'LMT End Date',       'date',         false, null, 4),
    (v_ct_482, v_482_s4, 'lmt_platforms',      'LMT Platforms',      'multi_select', false,
      '["Seek","LinkedIn","Indeed","Company Website","Other"]'::jsonb, 5),
    (v_ct_482, v_482_s4, 'lmt_applications_received', 'Applications Received', 'number',   false, null, 6),
    (v_ct_482, v_482_s4, 'lmt_australians_assessed',  'Australians Assessed',  'number',   false, null, 7),
    (v_ct_482, v_482_s4, 'lmt_outcome_summary', 'LMT Outcome Summary','textarea',    false, null, 8);

  -- SC-482: Worker Details
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_482, v_482_s5, 'worker_qualification',       'Worker Qualification',       'textarea', false, null, 1),
    (v_ct_482, v_482_s5, 'worker_experience',          'Worker Experience',          'textarea', false, null, 2),
    (v_ct_482, v_482_s5, 'skills_assessment_required', 'Skills Assessment Required', 'checkbox', false, null, 3),
    (v_ct_482, v_482_s5, 'skills_assessment_body',     'Skills Assessment Body',     'text',     false, null, 4),
    (v_ct_482, v_482_s5, 'skills_assessment_status',   'Skills Assessment Status',   'select',   false,
      '["Not Required","Not Started","In Progress","Approved","Refused"]'::jsonb, 5),
    (v_ct_482, v_482_s5, 'skills_assessment_number',   'Skills Assessment Number',   'text',     false, null, 6);

  -- SC-482: Key Dates
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_482, v_482_s6, 'nomination_lodgement_date', 'Nomination Lodgement Date', 'date',   false, null, 1),
    (v_ct_482, v_482_s6, 'nomination_trn',            'Nomination TRN',            'text',   false, null, 2),
    (v_ct_482, v_482_s6, 'nomination_decision_date',  'Nomination Decision Date',  'date',   false, null, 3),
    (v_ct_482, v_482_s6, 'nomination_status',         'Nomination Status',         'select', false,
      '["Not Lodged","Pending","Approved","Refused"]'::jsonb, 4),
    (v_ct_482, v_482_s6, 'visa_lodgement_date',       'Visa Lodgement Date',       'date',   false, null, 5),
    (v_ct_482, v_482_s6, 'visa_trn',                  'Visa TRN',                  'text',   false, null, 6);

  -- ============================================================
  -- SC-820/801 Sections & Fields
  -- ============================================================

  INSERT INTO case_template_sections (id, template_id, title, section_key, display_order) VALUES
    (v_820_s1, v_ct_820, 'Sponsor Details',       'sponsor_details',       1),
    (v_820_s2, v_ct_820, 'Relationship Timeline', 'relationship_timeline', 2),
    (v_820_s3, v_ct_820, 'Financial Aspects',     'financial_aspects',     3),
    (v_820_s4, v_ct_820, 'Household Aspects',     'household_aspects',     4),
    (v_820_s5, v_ct_820, 'Social Aspects',        'social_aspects',        5),
    (v_820_s6, v_ct_820, 'Commitment Evidence',   'commitment_evidence',   6),
    (v_820_s7, v_ct_820, 'Form 888 Witnesses',    'form_888_witnesses',    7),
    (v_820_s8, v_ct_820, 'Visa History',          'visa_history',          8);

  -- SC-820: Sponsor Details
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_820, v_820_s1, 'sponsor_full_name',       'Sponsor Full Name',       'text',     true,  1),
    (v_ct_820, v_820_s1, 'sponsor_date_of_birth',   'Sponsor Date of Birth',   'date',     false, 2),
    (v_ct_820, v_820_s1, 'sponsor_citizenship',     'Sponsor Citizenship',     'text',     true,  3),
    (v_ct_820, v_820_s1, 'sponsor_passport_number', 'Sponsor Passport Number', 'text',     false, 4),
    (v_ct_820, v_820_s1, 'sponsor_address',         'Sponsor Address',         'textarea', false, 5);

  -- SC-820: Relationship Timeline
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_820, v_820_s2, 'first_met_date',              'First Met Date',              'date',     true,  null, 1),
    (v_ct_820, v_820_s2, 'relationship_start_date',     'Relationship Start Date',     'date',     true,  null, 2),
    (v_ct_820, v_820_s2, 'committed_relationship_date', 'Committed Relationship Date', 'date',     false, null, 3),
    (v_ct_820, v_820_s2, 'cohabitation_start_date',     'Cohabitation Start Date',     'date',     false, null, 4),
    (v_ct_820, v_820_s2, 'marriage_date',               'Marriage Date',               'date',     false, null, 5),
    (v_ct_820, v_820_s2, 'relationship_type',           'Relationship Type',           'select',   false,
      '["Married","De Facto","Prospective Marriage"]'::jsonb, 6),
    (v_ct_820, v_820_s2, 'how_couple_met',              'How Couple Met',              'textarea', false, null, 7);

  -- SC-820: Financial Aspects
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_820, v_820_s3, 'joint_bank_accounts',              'Joint Bank Accounts',              'checkbox', false, 1),
    (v_ct_820, v_820_s3, 'joint_assets',                     'Joint Assets',                     'textarea', false, 2),
    (v_ct_820, v_820_s3, 'financial_interdependence_summary','Financial Interdependence Summary', 'textarea', false, 3);

  -- SC-820: Household Aspects
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_820, v_820_s4, 'shared_residence',           'Shared Residence',           'checkbox', false, 1),
    (v_ct_820, v_820_s4, 'shared_address_details',     'Shared Address Details',     'textarea', false, 2),
    (v_ct_820, v_820_s4, 'household_responsibilities', 'Household Responsibilities', 'textarea', false, 3);

  -- SC-820: Social Aspects
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_820, v_820_s5, 'social_recognition_summary', 'Social Recognition Summary', 'textarea', false, 1),
    (v_ct_820, v_820_s5, 'joint_travel',               'Joint Travel',               'textarea', false, 2),
    (v_ct_820, v_820_s5, 'mutual_friends_summary',     'Mutual Friends Summary',     'textarea', false, 3);

  -- SC-820: Commitment Evidence
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_820, v_820_s6, 'future_plans',        'Future Plans',        'textarea', false, 1),
    (v_ct_820, v_820_s6, 'commitment_summary',  'Commitment Summary',  'textarea', false, 2);

  -- SC-820: Form 888 Witnesses
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_820, v_820_s7, 'witness_1_name',          'Witness 1 Name',          'text', false, 1),
    (v_ct_820, v_820_s7, 'witness_1_citizenship',   'Witness 1 Citizenship',   'text', false, 2),
    (v_ct_820, v_820_s7, 'witness_1_relationship',  'Witness 1 Relationship',  'text', false, 3),
    (v_ct_820, v_820_s7, 'witness_2_name',          'Witness 2 Name',          'text', false, 4),
    (v_ct_820, v_820_s7, 'witness_2_citizenship',   'Witness 2 Citizenship',   'text', false, 5),
    (v_ct_820, v_820_s7, 'witness_2_relationship',  'Witness 2 Relationship',  'text', false, 6);

  -- SC-820: Visa History
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_820, v_820_s8, 'applicant_current_visa',  'Applicant Current Visa',  'text',     false, 1),
    (v_ct_820, v_820_s8, 'applicant_visa_expiry',   'Applicant Visa Expiry',   'date',     false, 2),
    (v_ct_820, v_820_s8, 'previous_partner_visa',   'Previous Partner Visa',   'checkbox', false, 3),
    (v_ct_820, v_820_s8, 'previous_relationships',  'Previous Relationships',  'textarea', false, 4);

  -- ============================================================
  -- SC-309/100 Sections & Fields
  -- ============================================================

  INSERT INTO case_template_sections (id, template_id, title, section_key, display_order) VALUES
    (v_309_s1, v_ct_309, 'Sponsor Details',          'sponsor_details',       1),
    (v_309_s2, v_ct_309, 'Relationship Timeline',    'relationship_timeline', 2),
    (v_309_s3, v_ct_309, 'Financial Aspects',        'financial_aspects',     3),
    (v_309_s4, v_ct_309, 'Social Aspects',           'social_aspects',        4),
    (v_309_s5, v_ct_309, 'Commitment Evidence',      'commitment_evidence',   5),
    (v_309_s6, v_ct_309, 'Form 888 Witnesses',       'form_888_witnesses',    6),
    (v_309_s7, v_ct_309, 'Applicant Location',       'applicant_location',    7),
    (v_309_s8, v_ct_309, 'Visa History',             'visa_history',          8);

  -- SC-309: Sponsor Details
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_309, v_309_s1, 'sponsor_full_name',       'Sponsor Full Name',       'text',     true,  1),
    (v_ct_309, v_309_s1, 'sponsor_date_of_birth',   'Sponsor Date of Birth',   'date',     false, 2),
    (v_ct_309, v_309_s1, 'sponsor_citizenship',     'Sponsor Citizenship',     'text',     true,  3),
    (v_ct_309, v_309_s1, 'sponsor_passport_number', 'Sponsor Passport Number', 'text',     false, 4),
    (v_ct_309, v_309_s1, 'sponsor_address',         'Sponsor Australian Address', 'textarea', false, 5);

  -- SC-309: Relationship Timeline
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_309, v_309_s2, 'first_met_date',              'First Met Date',              'date',     true,  null, 1),
    (v_ct_309, v_309_s2, 'relationship_start_date',     'Relationship Start Date',     'date',     true,  null, 2),
    (v_ct_309, v_309_s2, 'committed_relationship_date', 'Committed Relationship Date', 'date',     false, null, 3),
    (v_ct_309, v_309_s2, 'marriage_date',               'Marriage Date',               'date',     false, null, 4),
    (v_ct_309, v_309_s2, 'relationship_type',           'Relationship Type',           'select',   false,
      '["Married","De Facto","Prospective Marriage"]'::jsonb, 5),
    (v_ct_309, v_309_s2, 'how_couple_met',              'How Couple Met',              'textarea', false, null, 6),
    (v_ct_309, v_309_s2, 'time_spent_together',         'Time Spent Together',         'textarea', false, null, 7);

  -- SC-309: Financial Aspects
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_309, v_309_s3, 'joint_bank_accounts',              'Joint Bank Accounts',              'checkbox', false, 1),
    (v_ct_309, v_309_s3, 'joint_assets',                     'Joint Assets',                     'textarea', false, 2),
    (v_ct_309, v_309_s3, 'financial_interdependence_summary','Financial Interdependence Summary', 'textarea', false, 3);

  -- SC-309: Social Aspects
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_309, v_309_s4, 'social_recognition_summary', 'Social Recognition Summary', 'textarea', false, 1),
    (v_ct_309, v_309_s4, 'joint_travel',               'Joint Travel',               'textarea', false, 2),
    (v_ct_309, v_309_s4, 'mutual_friends_summary',     'Mutual Friends Summary',     'textarea', false, 3);

  -- SC-309: Commitment Evidence
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_309, v_309_s5, 'future_plans',       'Future Plans',       'textarea', false, 1),
    (v_ct_309, v_309_s5, 'commitment_summary', 'Commitment Summary', 'textarea', false, 2);

  -- SC-309: Form 888 Witnesses
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_309, v_309_s6, 'witness_1_name',         'Witness 1 Name',         'text', false, 1),
    (v_ct_309, v_309_s6, 'witness_1_citizenship',  'Witness 1 Citizenship',  'text', false, 2),
    (v_ct_309, v_309_s6, 'witness_1_relationship', 'Witness 1 Relationship', 'text', false, 3),
    (v_ct_309, v_309_s6, 'witness_2_name',         'Witness 2 Name',         'text', false, 4),
    (v_ct_309, v_309_s6, 'witness_2_citizenship',  'Witness 2 Citizenship',  'text', false, 5),
    (v_ct_309, v_309_s6, 'witness_2_relationship', 'Witness 2 Relationship', 'text', false, 6);

  -- SC-309: Applicant Location
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_309, v_309_s7, 'applicant_country',          'Applicant Country',          'text',   true,  null, 1),
    (v_ct_309, v_309_s7, 'applicant_city',             'Applicant City',             'text',   false, null, 2),
    (v_ct_309, v_309_s7, 'nearest_australian_mission', 'Nearest Australian Mission', 'text',   false, null, 3),
    (v_ct_309, v_309_s7, 'biometrics_required',        'Biometrics Required',        'checkbox', false, null, 4),
    (v_ct_309, v_309_s7, 'biometrics_status',          'Biometrics Status',          'select', false,
      '["Not Required","Pending","Completed"]'::jsonb, 5);

  -- SC-309: Visa History
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_309, v_309_s8, 'previous_australian_visas', 'Previous Australian Visas', 'textarea', false, 1),
    (v_ct_309, v_309_s8, 'previous_visa_refusals',    'Previous Visa Refusals',    'checkbox', false, 2),
    (v_ct_309, v_309_s8, 'refusal_details',           'Refusal Details',           'textarea', false, 3),
    (v_ct_309, v_309_s8, 'previous_partner_visa',     'Previous Partner Visa',     'checkbox', false, 4);

  -- ============================================================
  -- SC-485 Sections & Fields
  -- ============================================================

  INSERT INTO case_template_sections (id, template_id, title, section_key, display_order) VALUES
    (v_485_s1, v_ct_485, 'Course Details',       'course_details',     1),
    (v_485_s2, v_ct_485, 'Graduation Details',   'graduation_details', 2),
    (v_485_s3, v_ct_485, 'English Evidence',     'english_evidence',   3),
    (v_485_s4, v_ct_485, 'Skills Assessment',    'skills_assessment',  4),
    (v_485_s5, v_ct_485, 'Visa History',         'visa_history',       5);

  -- SC-485: Course Details
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_485, v_485_s1, 'course_name',        'Course Name',        'text',   true,  null, 1),
    (v_ct_485, v_485_s1, 'education_provider', 'Education Provider', 'text',   true,  null, 2),
    (v_ct_485, v_485_s1, 'campus_location',    'Campus Location',    'text',   false, null, 3),
    (v_ct_485, v_485_s1, 'course_level',       'Course Level',       'select', true,
      '["Diploma","Bachelor","Graduate Certificate","Graduate Diploma","Masters","PhD"]'::jsonb, 4),
    (v_ct_485, v_485_s1, 'course_start_date',  'Course Start Date',  'date',   false, null, 5),
    (v_ct_485, v_485_s1, 'course_end_date',    'Course End Date',    'date',   true,  null, 6),
    (v_ct_485, v_485_s1, 'cricos_code',        'CRICOS Code',        'text',   false, null, 7);

  -- SC-485: Graduation Details
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_485, v_485_s2, 'graduation_date',      'Graduation Date',      'date',   true,  null, 1),
    (v_ct_485, v_485_s2, 'transcript_received',  'Transcript Received',  'checkbox', false, null, 2),
    (v_ct_485, v_485_s2, 'degree_certificate_received', 'Degree Certificate Received', 'checkbox', false, null, 3),
    (v_ct_485, v_485_s2, 'visa_stream',          'Visa Stream',          'select', true,
      '["Graduate Work Stream","Post-Study Work Stream"]'::jsonb, 4),
    (v_ct_485, v_485_s2, 'occupation_if_gw',     'Occupation (Graduate Work stream)', 'text', false, null, 5),
    (v_ct_485, v_485_s2, 'anzsco_code',          'ANZSCO Code',          'text',   false, null, 6);

  -- SC-485: English Evidence
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_485, v_485_s3, 'english_test_type',    'Test Type', 'select', true,
      '["IELTS","PTE Academic","TOEFL iBT","Cambridge C1","OET","Exempt"]'::jsonb, 1);
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, help_text, display_order) VALUES
    (v_ct_485, v_485_s3, 'english_test_date',    'Test Date',       'date', false, null, 2),
    (v_ct_485, v_485_s3, 'english_overall_score','Overall Score',   'text', true,  'Minimum 6.0 overall', 3),
    (v_ct_485, v_485_s3, 'english_listening',    'Listening',       'text', false, null, 4),
    (v_ct_485, v_485_s3, 'english_reading',      'Reading',         'text', false, null, 5),
    (v_ct_485, v_485_s3, 'english_writing',      'Writing',         'text', false, null, 6),
    (v_ct_485, v_485_s3, 'english_speaking',     'Speaking',        'text', false, null, 7);

  -- SC-485: Skills Assessment
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_485, v_485_s4, 'skills_assessment_required', 'Skills Assessment Required', 'checkbox', false, null, 1),
    (v_ct_485, v_485_s4, 'skills_assessment_body',     'Assessing Body',             'text',     false, null, 2),
    (v_ct_485, v_485_s4, 'skills_assessment_status',   'Assessment Status',          'select',   false,
      '["Not Required","Not Started","In Progress","Approved","Refused"]'::jsonb, 3),
    (v_ct_485, v_485_s4, 'skills_assessment_number',   'Assessment Number',          'text',     false, null, 4),
    (v_ct_485, v_485_s4, 'skills_assessment_expiry',   'Assessment Expiry',          'date',     false, null, 5);

  -- SC-485: Visa History
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_485, v_485_s5, 'current_visa_subclass',     'Current Visa Subclass',     'text',     false, 1),
    (v_ct_485, v_485_s5, 'current_visa_expiry',       'Current Visa Expiry',       'date',     false, 2),
    (v_ct_485, v_485_s5, 'student_visa_grant_date',   'Student Visa Grant Date',   'date',     false, 3),
    (v_ct_485, v_485_s5, 'previous_visa_refusals',    'Previous Visa Refusals',    'checkbox', false, 4),
    (v_ct_485, v_485_s5, 'refusal_details',           'Refusal Details',           'textarea', false, 5);

  -- ============================================================
  -- SC-600 Sections & Fields
  -- ============================================================

  INSERT INTO case_template_sections (id, template_id, title, section_key, display_order) VALUES
    (v_600_s1, v_ct_600, 'Travel Details',          'travel_details',     1),
    (v_600_s2, v_ct_600, 'Financial Evidence',      'financial_evidence', 2),
    (v_600_s3, v_ct_600, 'Ties to Home Country',    'home_country_ties',  3),
    (v_600_s4, v_ct_600, 'Sponsor Details',         'sponsor_details',    4),
    (v_600_s5, v_ct_600, 'Visa History',            'visa_history',       5);

  -- SC-600: Travel Details
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_ct_600, v_600_s1, 'visa_stream',          'Visa Stream',          'select', true,
      '["Tourist","Business Visitor","Sponsored Family Visitor","Approved Destination Status"]'::jsonb, 1),
    (v_ct_600, v_600_s1, 'intended_arrival_date','Intended Arrival Date','date',   false, null, 2),
    (v_ct_600, v_600_s1, 'intended_departure_date','Intended Departure Date','date',false, null, 3),
    (v_ct_600, v_600_s1, 'length_of_stay',       'Length of Stay (days)', 'number', true, null, 4),
    (v_ct_600, v_600_s1, 'purpose_of_visit',     'Purpose of Visit',     'textarea', true, null, 5),
    (v_ct_600, v_600_s1, 'states_to_visit',      'States to Visit',      'text',   false, null, 6);

  -- SC-600: Financial Evidence
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_600, v_600_s2, 'funds_available',         'Funds Available (AUD)', 'currency', false, 1),
    (v_ct_600, v_600_s2, 'financial_evidence_types','Financial Evidence Types','textarea',false, 2),
    (v_ct_600, v_600_s2, 'employment_status',       'Employment Status',    'text',      false, 3),
    (v_ct_600, v_600_s2, 'employer_name',           'Employer Name',        'text',      false, 4),
    (v_ct_600, v_600_s2, 'annual_income',           'Annual Income',        'currency',  false, 5);

  -- SC-600: Ties to Home Country
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_600, v_600_s3, 'home_country',              'Home Country',              'text',     true,  1),
    (v_ct_600, v_600_s3, 'property_owned',            'Property Owned',            'checkbox', false, 2),
    (v_ct_600, v_600_s3, 'family_ties_summary',       'Family Ties',               'textarea', false, 3),
    (v_ct_600, v_600_s3, 'employment_ties_summary',   'Employment Ties',           'textarea', false, 4),
    (v_ct_600, v_600_s3, 'other_ties_summary',        'Other Ties to Home Country','textarea', false, 5);

  -- SC-600: Sponsor Details (Sponsored Family Stream)
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_600, v_600_s4, 'sponsor_name',              'Sponsor Name',              'text', false, 1),
    (v_ct_600, v_600_s4, 'sponsor_visa_status',       'Sponsor Visa Status',       'text', false, 2),
    (v_ct_600, v_600_s4, 'sponsor_relationship',      'Relationship to Applicant', 'text', false, 3),
    (v_ct_600, v_600_s4, 'sponsor_address',           'Sponsor Australian Address','textarea', false, 4);

  -- SC-600: Visa History
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_ct_600, v_600_s5, 'previous_australian_visas', 'Previous Australian Visas', 'textarea', false, 1),
    (v_ct_600, v_600_s5, 'previous_visa_refusals',    'Previous Visa Refusals',    'checkbox', false, 2),
    (v_ct_600, v_600_s5, 'refusal_details',           'Refusal Details',           'textarea', false, 3),
    (v_ct_600, v_600_s5, 'condition_8503_held',       'Has Condition 8503',        'checkbox', false, 4),
    (v_ct_600, v_600_s5, 'waiver_required',           'Waiver Required',           'checkbox', false, 5);

END $$;

-- ============================================================
-- PART 3: DOCUMENT TYPES
-- SC-500 and SC-482 are seeded by migration 20250518008.
-- Add remaining subclasses here.
-- ============================================================

-- SC-820/801 Partner Visa Onshore
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload) VALUES
  ('820', 'Applicant passport (bio data page)',              true,  'client'),
  ('820', 'Sponsor passport or citizenship certificate',     true,  null),
  ('820', 'Applicant birth certificate',                     false, 'client'),
  ('820', 'Sponsor birth certificate',                       false, null),
  ('820', 'Marriage certificate (if married)',               false, 'client'),
  ('820', 'Relationship statement — applicant',              true,  'client'),
  ('820', 'Relationship statement — sponsor',                true,  null),
  ('820', 'Form 888 — Witness 1',                           true,  null),
  ('820', 'Form 888 — Witness 2',                           true,  null),
  ('820', 'Evidence of financial interdependence',          true,  'client'),
  ('820', 'Evidence of shared household',                   true,  'client'),
  ('820', 'Evidence of social recognition',                 true,  'client'),
  ('820', 'Photos together (chronological)',                 true,  'client'),
  ('820', 'Health assessment (HAP)',                         true,  'client'),
  ('820', 'Police clearance — home country',                 true,  'client'),
  ('820', 'Police clearance — other countries (3+ months)', false, 'client'),
  ('820', 'Visa application form (Form 47SP)',               true,  null),
  ('820', 'Sponsorship form (Form 40SP)',                    true,  null);

-- SC-309/100 Partner Visa Offshore
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload) VALUES
  ('309', 'Applicant passport (bio data page)',              true,  'client'),
  ('309', 'Sponsor passport or citizenship certificate',     true,  null),
  ('309', 'Applicant birth certificate',                     false, 'client'),
  ('309', 'Marriage certificate (if married)',               false, 'client'),
  ('309', 'Relationship statement — applicant',              true,  'client'),
  ('309', 'Relationship statement — sponsor',                true,  null),
  ('309', 'Form 888 — Witness 1',                           true,  null),
  ('309', 'Form 888 — Witness 2',                           true,  null),
  ('309', 'Evidence of financial interdependence',          true,  'client'),
  ('309', 'Evidence of social recognition',                 true,  'client'),
  ('309', 'Photos together (chronological)',                 true,  'client'),
  ('309', 'Communication records (messages/calls)',          true,  'client'),
  ('309', 'Health assessment (overseas HAP)',                true,  'client'),
  ('309', 'Police clearance — home country',                 true,  'client'),
  ('309', 'Police clearance — other countries (3+ months)', false, 'client'),
  ('309', 'Biometrics proof (if required)',                  false, 'client'),
  ('309', 'Visa application form (Form 47SP)',               true,  null),
  ('309', 'Sponsorship form (Form 40SP)',                    true,  null);

-- SC-485 Temporary Graduate Visa
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload) VALUES
  ('485', 'Passport (bio data page)',                        true,  'client'),
  ('485', 'Academic transcripts',                            true,  'client'),
  ('485', 'Degree/qualification certificate',                true,  'client'),
  ('485', 'CoE or letter of completion from institution',    true,  'client'),
  ('485', 'English language test results (IELTS/PTE 6.0)',  true,  'client'),
  ('485', 'Skills assessment certificate (Graduate Work)',   false, 'client'),
  ('485', 'Health assessment (HAP)',                         true,  'client'),
  ('485', 'Police clearance',                                true,  'client'),
  ('485', 'Visa application form (Form 1066)',               true,  null);

-- SC-600 Visitor Visa
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload) VALUES
  ('600', 'Passport (bio data page)',                        true,  'client'),
  ('600', 'Bank statements (3 months)',                      true,  'client'),
  ('600', 'Evidence of employment (letter from employer)',   true,  'client'),
  ('600', 'Evidence of ties to home country',                true,  'client'),
  ('600', 'Travel itinerary',                                false, 'client'),
  ('600', 'Accommodation bookings',                          false, 'client'),
  ('600', 'Return flight bookings',                          false, 'client'),
  ('600', 'Sponsor Form 1163 (Sponsored Family stream)',     false, null),
  ('600', 'Health insurance evidence',                       false, 'client');
