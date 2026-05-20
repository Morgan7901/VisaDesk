DO $$
DECLARE
  -- Template IDs
  v_tmpl_500  uuid := gen_random_uuid();
  v_tmpl_482  uuid := gen_random_uuid();
  v_tmpl_820  uuid := gen_random_uuid();

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

BEGIN

  -- ============================================================
  -- Templates
  -- ============================================================

  INSERT INTO case_templates (id, firm_id, visa_subclass, name, is_system_default) VALUES
    (v_tmpl_500, null, '500', 'Student Visa (SC-500)', true),
    (v_tmpl_482, null, '482', 'Temporary Skill Shortage (SC-482)', true),
    (v_tmpl_820, null, '820', 'Partner Visa Onshore (SC-820/801)', true);

  -- ============================================================
  -- SC-500 Sections
  -- ============================================================

  INSERT INTO case_template_sections (id, template_id, title, section_key, display_order) VALUES
    (v_500_s1, v_tmpl_500, 'Course Details',     'course_details',     1),
    (v_500_s2, v_tmpl_500, 'Enrolment',          'enrolment',          2),
    (v_500_s3, v_tmpl_500, 'OSHC',               'oshc',               3),
    (v_500_s4, v_tmpl_500, 'English Evidence',   'english_evidence',   4),
    (v_500_s5, v_tmpl_500, 'Financial Capacity', 'financial_capacity', 5),
    (v_500_s6, v_tmpl_500, 'Visa History',       'visa_history',       6);

  -- SC-500 Section 1: Course Details
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_tmpl_500, v_500_s1, 'course_name',         'Course Name',          'text',   true,  null, 1),
    (v_tmpl_500, v_500_s1, 'education_provider',  'Education Provider',   'text',   true,  null, 2),
    (v_tmpl_500, v_500_s1, 'campus_location',     'Campus Location',      'text',   false, null, 3),
    (v_tmpl_500, v_500_s1, 'course_level',        'Course Level',         'select', false, '["Certificate","Diploma","Bachelor","Graduate Certificate","Graduate Diploma","Masters","PhD","ELICOS","Foundation"]'::jsonb, 4),
    (v_tmpl_500, v_500_s1, 'course_start_date',   'Course Start Date',    'date',   true,  null, 5),
    (v_tmpl_500, v_500_s1, 'course_end_date',     'Course End Date',      'date',   true,  null, 6);

  -- SC-500 Section 2: Enrolment
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, help_text, display_order) VALUES
    (v_tmpl_500, v_500_s2, 'coe_number',          'CoE Number',           'text',   false, 'Confirmation of Enrolment number from provider', 1),
    (v_tmpl_500, v_500_s2, 'coe_issue_date',      'CoE Issue Date',       'date',   false, null, 2),
    (v_tmpl_500, v_500_s2, 'coe_expiry_date',     'CoE Expiry Date',      'date',   false, null, 3),
    (v_tmpl_500, v_500_s2, 'provider_cricos_code','Provider CRICOS Code', 'text',   false, null, 4);

  -- SC-500 Section 3: OSHC
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_tmpl_500, v_500_s3, 'oshc_provider',       'OSHC Provider',        'text',   false, 1),
    (v_tmpl_500, v_500_s3, 'oshc_policy_number',  'Policy Number',        'text',   false, 2),
    (v_tmpl_500, v_500_s3, 'oshc_start_date',     'OSHC Start Date',      'date',   false, 3),
    (v_tmpl_500, v_500_s3, 'oshc_end_date',       'OSHC End Date',        'date',   false, 4);

  -- SC-500 Section 4: English Evidence
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_tmpl_500, v_500_s4, 'english_test_type',   'Test Type',            'select', false, '["IELTS","PTE Academic","TOEFL iBT","Cambridge C1","OET","Exempt"]'::jsonb, 1);
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_tmpl_500, v_500_s4, 'english_test_date',   'Test Date',            'date',   false, 2),
    (v_tmpl_500, v_500_s4, 'english_overall_score','Overall Score',       'text',   false, 3),
    (v_tmpl_500, v_500_s4, 'english_listening',   'Listening',            'text',   false, 4),
    (v_tmpl_500, v_500_s4, 'english_reading',     'Reading',              'text',   false, 5),
    (v_tmpl_500, v_500_s4, 'english_writing',     'Writing',              'text',   false, 6),
    (v_tmpl_500, v_500_s4, 'english_speaking',    'Speaking',             'text',   false, 7);

  -- SC-500 Section 5: Financial Capacity
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, help_text, display_order) VALUES
    (v_tmpl_500, v_500_s5, 'funds_available',     'Funds Available',      'currency', false, 'Living cost requirement: AUD $29,710/year', 1),
    (v_tmpl_500, v_500_s5, 'financial_sponsor_name', 'Sponsor Name',      'text',   false, null, 2),
    (v_tmpl_500, v_500_s5, 'financial_sponsor_relationship', 'Sponsor Relationship', 'text', false, null, 3),
    (v_tmpl_500, v_500_s5, 'funds_source',        'Source of Funds',      'textarea', false, null, 4);

  -- SC-500 Section 6: Visa History
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_tmpl_500, v_500_s6, 'previous_australian_visas', 'Previous Australian Visas', 'textarea', false, 1),
    (v_tmpl_500, v_500_s6, 'previous_visa_refusals',    'Previous Visa Refusals',    'checkbox', false, 2),
    (v_tmpl_500, v_500_s6, 'refusal_details',           'Refusal Details',           'textarea', false, 3),
    (v_tmpl_500, v_500_s6, 'current_visa_subclass',     'Current Visa Subclass',     'text',     false, 4),
    (v_tmpl_500, v_500_s6, 'current_visa_expiry',       'Current Visa Expiry',       'date',     false, 5);

  -- ============================================================
  -- SC-482 Sections
  -- ============================================================

  INSERT INTO case_template_sections (id, template_id, title, section_key, display_order) VALUES
    (v_482_s1, v_tmpl_482, 'Nomination Details',      'nomination_details',     1),
    (v_482_s2, v_tmpl_482, 'Salary and TSMIT',        'salary_tsmit',           2),
    (v_482_s3, v_tmpl_482, 'Sponsorship',             'sponsorship',            3),
    (v_482_s4, v_tmpl_482, 'Labour Market Testing',   'labour_market_testing',  4),
    (v_482_s5, v_tmpl_482, 'Worker Details',          'worker_details',         5),
    (v_482_s6, v_tmpl_482, 'Key Dates',               'key_dates',              6);

  -- SC-482 Section 1: Nomination Details
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, help_text, options, display_order) VALUES
    (v_tmpl_482, v_482_s1, 'nominated_position',  'Nominated Position',   'text',   true,  null, null, 1),
    (v_tmpl_482, v_482_s1, 'anzsco_code',         'ANZSCO Code',          'text',   true,  '6-digit ANZSCO occupation code', null, 2),
    (v_tmpl_482, v_482_s1, 'anzsco_title',        'ANZSCO Title',         'text',   false, null, null, 3),
    (v_tmpl_482, v_482_s1, 'employment_type',     'Employment Type',      'select', false, null, '["Full-time","Part-time"]'::jsonb, 4),
    (v_tmpl_482, v_482_s1, 'work_location',       'Work Location',        'text',   true,  null, null, 5),
    (v_tmpl_482, v_482_s1, 'visa_stream',         'Visa Stream',          'select', false, null, '["Short-term","Medium-term","Labour Agreement"]'::jsonb, 6);

  -- SC-482 Section 2: Salary and TSMIT
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, help_text, options, display_order) VALUES
    (v_tmpl_482, v_482_s2, 'salary_amount',       'Salary Amount',        'currency', true, 'Must meet TSMIT — currently $73,150', null, 1),
    (v_tmpl_482, v_482_s2, 'salary_includes_super','Salary Includes Super','checkbox', false, null, null, 2),
    (v_tmpl_482, v_482_s2, 'amsr_amount',         'AMSR Amount',          'currency', false, null, null, 3),
    (v_tmpl_482, v_482_s2, 'market_salary_evidence','Market Salary Evidence','textarea', false, null, null, 4);

  -- SC-482 Section 3: Sponsorship
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_tmpl_482, v_482_s3, 'sbs_status',          'SBS Status',           'select',   true,  '["Not Applied","Pending","Approved","Expired"]'::jsonb, 1),
    (v_tmpl_482, v_482_s3, 'sbs_approval_date',   'SBS Approval Date',    'date',     false, null, 2),
    (v_tmpl_482, v_482_s3, 'sbs_expiry_date',     'SBS Expiry Date',      'date',     false, null, 3),
    (v_tmpl_482, v_482_s3, 'sponsorship_obligations_acknowledged', 'Sponsorship Obligations Acknowledged', 'checkbox', false, null, 4);

  -- SC-482 Section 4: Labour Market Testing
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_tmpl_482, v_482_s4, 'lmt_required',        'LMT Required',         'checkbox',     false, null, 1),
    (v_tmpl_482, v_482_s4, 'lmt_exempt_reason',   'LMT Exempt Reason',    'select',       false, '["FTA country — New Zealand","FTA country — Chile","FTA country — Korea","FTA country — Japan","FTA country — China","FTA country — ASEAN","Earnings above LMT threshold","International trade obligation","Other"]'::jsonb, 2),
    (v_tmpl_482, v_482_s4, 'lmt_start_date',      'LMT Start Date',       'date',         false, null, 3),
    (v_tmpl_482, v_482_s4, 'lmt_end_date',        'LMT End Date',         'date',         false, null, 4),
    (v_tmpl_482, v_482_s4, 'lmt_platforms',       'LMT Platforms',        'multi_select', false, '["Seek","LinkedIn","Indeed","Company Website","Other"]'::jsonb, 5),
    (v_tmpl_482, v_482_s4, 'lmt_applications_received', 'Applications Received', 'number', false, null, 6),
    (v_tmpl_482, v_482_s4, 'lmt_australians_assessed',  'Australians Assessed',  'number', false, null, 7),
    (v_tmpl_482, v_482_s4, 'lmt_outcome_summary', 'LMT Outcome Summary',  'textarea',     false, null, 8);

  -- SC-482 Section 5: Worker Details
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_tmpl_482, v_482_s5, 'worker_qualification',       'Worker Qualification',         'textarea', false, null, 1),
    (v_tmpl_482, v_482_s5, 'worker_experience',          'Worker Experience',            'textarea', false, null, 2),
    (v_tmpl_482, v_482_s5, 'skills_assessment_required', 'Skills Assessment Required',   'checkbox', false, null, 3),
    (v_tmpl_482, v_482_s5, 'skills_assessment_body',     'Skills Assessment Body',       'text',     false, null, 4),
    (v_tmpl_482, v_482_s5, 'skills_assessment_status',   'Skills Assessment Status',     'select',   false, '["Not Required","Not Started","In Progress","Approved","Refused"]'::jsonb, 5),
    (v_tmpl_482, v_482_s5, 'skills_assessment_number',   'Skills Assessment Number',     'text',     false, null, 6);

  -- SC-482 Section 6: Key Dates
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_tmpl_482, v_482_s6, 'nomination_lodgement_date', 'Nomination Lodgement Date', 'date',   false, null, 1),
    (v_tmpl_482, v_482_s6, 'nomination_trn',            'Nomination TRN',            'text',   false, null, 2),
    (v_tmpl_482, v_482_s6, 'nomination_decision_date',  'Nomination Decision Date',  'date',   false, null, 3),
    (v_tmpl_482, v_482_s6, 'nomination_status',         'Nomination Status',         'select', false, '["Not Lodged","Pending","Approved","Refused"]'::jsonb, 4),
    (v_tmpl_482, v_482_s6, 'visa_lodgement_date',       'Visa Lodgement Date',       'date',   false, null, 5),
    (v_tmpl_482, v_482_s6, 'visa_trn',                  'Visa TRN',                  'text',   false, null, 6);

  -- ============================================================
  -- SC-820 Sections
  -- ============================================================

  INSERT INTO case_template_sections (id, template_id, title, section_key, display_order) VALUES
    (v_820_s1, v_tmpl_820, 'Sponsor Details',        'sponsor_details',        1),
    (v_820_s2, v_tmpl_820, 'Relationship Timeline',  'relationship_timeline',  2),
    (v_820_s3, v_tmpl_820, 'Financial Aspects',      'financial_aspects',      3),
    (v_820_s4, v_tmpl_820, 'Household Aspects',      'household_aspects',      4),
    (v_820_s5, v_tmpl_820, 'Social Aspects',         'social_aspects',         5),
    (v_820_s6, v_tmpl_820, 'Commitment Evidence',    'commitment_evidence',    6),
    (v_820_s7, v_tmpl_820, 'Form 888 Witnesses',     'form_888_witnesses',     7),
    (v_820_s8, v_tmpl_820, 'Visa History',           'visa_history',           8);

  -- SC-820 Section 1: Sponsor Details
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_tmpl_820, v_820_s1, 'sponsor_full_name',      'Sponsor Full Name',      'text',     true,  1),
    (v_tmpl_820, v_820_s1, 'sponsor_date_of_birth',  'Sponsor Date of Birth',  'date',     false, 2),
    (v_tmpl_820, v_820_s1, 'sponsor_citizenship',    'Sponsor Citizenship',    'text',     true,  3),
    (v_tmpl_820, v_820_s1, 'sponsor_passport_number','Sponsor Passport Number','text',     false, 4),
    (v_tmpl_820, v_820_s1, 'sponsor_address',        'Sponsor Address',        'textarea', false, 5);

  -- SC-820 Section 2: Relationship Timeline
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, options, display_order) VALUES
    (v_tmpl_820, v_820_s2, 'first_met_date',              'First Met Date',              'date',     true,  null, 1),
    (v_tmpl_820, v_820_s2, 'relationship_start_date',     'Relationship Start Date',     'date',     true,  null, 2),
    (v_tmpl_820, v_820_s2, 'committed_relationship_date', 'Committed Relationship Date', 'date',     false, null, 3),
    (v_tmpl_820, v_820_s2, 'cohabitation_start_date',     'Cohabitation Start Date',     'date',     false, null, 4),
    (v_tmpl_820, v_820_s2, 'marriage_date',               'Marriage Date',               'date',     false, null, 5),
    (v_tmpl_820, v_820_s2, 'relationship_type',           'Relationship Type',           'select',   false, '["Married","De Facto","Prospective Marriage"]'::jsonb, 6),
    (v_tmpl_820, v_820_s2, 'how_couple_met',              'How Couple Met',              'textarea', false, null, 7);

  -- SC-820 Section 3: Financial Aspects
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_tmpl_820, v_820_s3, 'joint_bank_accounts',         'Joint Bank Accounts',         'checkbox', false, 1),
    (v_tmpl_820, v_820_s3, 'joint_assets',                'Joint Assets',                'textarea', false, 2),
    (v_tmpl_820, v_820_s3, 'financial_interdependence_summary', 'Financial Interdependence Summary', 'textarea', false, 3);

  -- SC-820 Section 4: Household Aspects
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_tmpl_820, v_820_s4, 'shared_residence',            'Shared Residence',            'checkbox', false, 1),
    (v_tmpl_820, v_820_s4, 'shared_address_details',      'Shared Address Details',      'textarea', false, 2),
    (v_tmpl_820, v_820_s4, 'household_responsibilities',  'Household Responsibilities',  'textarea', false, 3);

  -- SC-820 Section 5: Social Aspects
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_tmpl_820, v_820_s5, 'social_recognition_summary',  'Social Recognition Summary',  'textarea', false, 1),
    (v_tmpl_820, v_820_s5, 'joint_travel',                'Joint Travel',                'textarea', false, 2),
    (v_tmpl_820, v_820_s5, 'mutual_friends_summary',      'Mutual Friends Summary',      'textarea', false, 3);

  -- SC-820 Section 6: Commitment Evidence
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_tmpl_820, v_820_s6, 'future_plans',                'Future Plans',                'textarea', false, 1),
    (v_tmpl_820, v_820_s6, 'commitment_summary',          'Commitment Summary',          'textarea', false, 2);

  -- SC-820 Section 7: Form 888 Witnesses
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_tmpl_820, v_820_s7, 'witness_1_name',              'Witness 1 Name',              'text', false, 1),
    (v_tmpl_820, v_820_s7, 'witness_1_citizenship',       'Witness 1 Citizenship',       'text', false, 2),
    (v_tmpl_820, v_820_s7, 'witness_1_relationship',      'Witness 1 Relationship',      'text', false, 3),
    (v_tmpl_820, v_820_s7, 'witness_2_name',              'Witness 2 Name',              'text', false, 4),
    (v_tmpl_820, v_820_s7, 'witness_2_citizenship',       'Witness 2 Citizenship',       'text', false, 5),
    (v_tmpl_820, v_820_s7, 'witness_2_relationship',      'Witness 2 Relationship',      'text', false, 6);

  -- SC-820 Section 8: Visa History
  INSERT INTO case_template_fields (template_id, section_id, field_key, label, field_type, required, display_order) VALUES
    (v_tmpl_820, v_820_s8, 'applicant_current_visa',      'Applicant Current Visa',      'text',     false, 1),
    (v_tmpl_820, v_820_s8, 'applicant_visa_expiry',       'Applicant Visa Expiry',       'date',     false, 2),
    (v_tmpl_820, v_820_s8, 'previous_partner_visa',       'Previous Partner Visa',       'checkbox', false, 3),
    (v_tmpl_820, v_820_s8, 'previous_relationships',      'Previous Relationships',      'textarea', false, 4);

END $$;
