-- ============================================================
-- Migration: Comprehensive Document Types Rebuild
-- Deletes all existing document_types (safe — case_documents rows
-- reference them via document_type_id but we keep case_documents).
-- Inserts a full, categorised set for all 6 visa subclasses.
-- ============================================================

-- Remove FK constraint dependency: set document_type_id = NULL on all
-- case_documents rows first so we can safely delete document_types,
-- then we insert fresh types. The labels on case_documents rows are
-- the source of truth for display; document_type_id is only used for
-- the Load Standard Docs grouping and field inheritance.
UPDATE case_documents SET document_type_id = NULL WHERE document_type_id IS NOT NULL;

DELETE FROM document_types;

-- ── SC-500 Student Visa ──────────────────────────────────────

-- Identity
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('500', 'Passport (bio data page)',          true,  'client', 'identity',  true,  false, false, false, 10),
  ('500', 'National ID Card',                  false, 'client', 'identity',  false, false, true,  false, 20),
  ('500', 'Birth Certificate',                 false, 'client', 'identity',  false, false, true,  false, 30);

-- Education
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, default_validity_days, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('500', 'Academic Transcripts',              true,  'client', 'education', false, NULL, true,  false, false, 40),
  ('500', 'Graduation Certificates',           true,  'client', 'education', false, NULL, true,  false, false, 50),
  ('500', 'English Language Test Results',     true,  'client', 'education', true,  730,  false, false, false, 60),
  ('500', 'Resume / CV',                       false, 'client', 'education', false, NULL, false, false, false, 70),
  ('500', 'Current Enrolment Evidence',        false, 'client', 'education', false, NULL, false, false, false, 80);

-- Australian Study Requirements
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('500', 'Confirmation of Enrolment (CoE)',   true,  'client', 'legal',     false, false, false, false, 90),
  ('500', 'OSHC Insurance Policy',             true,  'client', 'legal',     true,  false, false, false, 100);

-- Financial
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('500', 'Bank Statements',                   true,  'client', 'financial', false, true,  false, false, 110),
  ('500', 'Sponsor Affidavit / Support Letter',false, 'client', 'financial', false, false, true,  false, 120),
  ('500', 'Income Evidence',                   false, 'client', 'financial', false, false, false, false, 130),
  ('500', 'Tax Returns',                       false, 'client', 'financial', false, false, false, false, 140),
  ('500', 'Payslips',                          false, 'client', 'financial', false, true,  false, false, 150),
  ('500', 'Savings History',                   false, 'client', 'financial', false, false, false, false, 160);

-- Health / Character
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, default_validity_days, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('500', 'Health Assessment (HAP)',            false, 'client', 'health',    true,  365,  false, true,  false, 170),
  ('500', 'Police Clearance',                  false, 'client', 'health',    true,  365,  false, true,  false, 180);

-- Previous Visa History
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('500', 'Previous Australian Visa Evidence', false, 'client', 'legal',     false, false, false, false, 190),
  ('500', 'Previous Refusal Letters',          false, 'client', 'legal',     false, false, true,  false, 200);

-- Internal / Agent
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('500', 'Immi Application Record',           true,  NULL,     'internal',  false, false, false, true,  210),
  ('500', 'Agent Risk Assessment Notes',       false, NULL,     'internal',  false, false, false, true,  220);

-- ── SC-482 Skills in Demand ──────────────────────────────────

-- Worker — Identity
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('482', 'Worker Passport',                   true,  'client', 'identity',  true,  false, false, false, 10),
  ('482', 'Birth Certificate',                 false, 'client', 'identity',  false, false, true,  false, 20);

-- Worker — Employment
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('482', 'Resume / CV',                       true,  'client', 'employment',false, false, false, false, 30),
  ('482', 'Employment Reference Letters',      true,  'client', 'employment',false, true,  false, false, 40),
  ('482', 'Payslips',                          false, 'client', 'employment',false, true,  false, false, 50),
  ('482', 'Employment Contracts',              false, 'client', 'employment',false, true,  false, false, 60);

-- Worker — Qualifications
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, default_validity_days, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('482', 'Degree Certificates',               true,  'client', 'education', false, NULL, true,  false, false, 70),
  ('482', 'Academic Transcripts',              true,  'client', 'education', false, NULL, true,  false, false, 80),
  ('482', 'Skills Assessment Certificate',     false, 'client', 'education', true,  NULL, false, true,  false, 90),
  ('482', 'Professional Licences',             false, 'client', 'education', false, NULL, true,  false, false, 100);

-- Worker — Visa Requirements
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, default_validity_days, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('482', 'English Language Evidence',         true,  'client', 'legal',     true,  730,  false, false, false, 110),
  ('482', 'Health Insurance Evidence',         false, 'client', 'legal',     true,  NULL, false, true,  false, 120),
  ('482', 'Police Clearance',                  false, 'client', 'health',    true,  365,  false, true,  false, 130),
  ('482', 'Health Assessment',                 false, 'client', 'health',    true,  365,  false, true,  false, 140);

-- Sponsor — Business
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, sponsor_visible, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('482', 'ASIC Extract / Business Registration', true, 'sponsor','business', true,  false, false, false, false, 150),
  ('482', 'ABN Registration Evidence',         true,  'sponsor','business', true,  false, false, false, false, 160),
  ('482', 'Company Financials (2 years)',       true,  'sponsor','business', true,  false, true,  false, false, 170),
  ('482', 'BAS Statements',                    false, 'sponsor','business', true,  false, true,  false, false, 180),
  ('482', 'Organisation Chart',                false, 'sponsor','business', true,  false, false, false, false, 190);

-- Sponsor — Position
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, sponsor_visible, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('482', 'Position Description',              true,  'sponsor','employment',true,  false, false, false, false, 200),
  ('482', 'Employment Contract (Template)',     true,  'sponsor','employment',true,  false, false, false, false, 210),
  ('482', 'Salary Evidence',                   true,  'sponsor','employment',true,  false, false, false, false, 220),
  ('482', 'AMSR Evidence',                     false, 'sponsor','employment',true,  false, false, false, false, 230);

-- Sponsor — LMT
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, sponsor_visible, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('482', 'Job Advertisements',                false, 'sponsor','legal',     true,  false, true,  true,  false, 240),
  ('482', 'Seek / LinkedIn Ad Screenshots',    false, 'sponsor','legal',     true,  false, true,  true,  false, 250),
  ('482', 'Applicant Summary / Rejection Notes',false,'sponsor','legal',     true,  false, false, true,  false, 260),
  ('482', 'Recruitment Outcome Notes',         false, 'sponsor','legal',     true,  false, false, true,  false, 270);

-- Sponsor — Sponsorship
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, sponsor_visible, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('482', 'SBS Approval Letter',               false, 'sponsor','legal',     true,  true,  false, true,  false, 280),
  ('482', 'Sponsorship Obligations Acknowledgement', true, 'sponsor','legal', true, false, false, false, false, 290);

-- Internal
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('482', 'Nomination Form (Form 1395)',        true,  NULL,     'internal',  false, false, false, true,  300),
  ('482', 'Visa Application Form (Form 1066)', true,  NULL,     'internal',  false, false, false, true,  310),
  ('482', 'LMT Compliance Summary',            true,  NULL,     'internal',  false, false, false, true,  320);

-- ── SC-820/801 Partner Visa Onshore ─────────────────────────

-- Identity
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('820', 'Applicant Passport',                true,  'client', 'identity',  true,  false, false, false, 10),
  ('820', 'Sponsor Passport / Citizenship Evidence', true, 'client','identity',true, false, false, false, 20),
  ('820', 'Birth Certificates',                true,  'client', 'identity',  false, true,  false, false, 30);

-- Relationship
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('820', 'Relationship Statement — Applicant',true,  'client', 'relationship',false,false, false, false, 40),
  ('820', 'Relationship Statement — Sponsor',  true,  'client', 'relationship',false,false, false, false, 50),
  ('820', 'Marriage Certificate',              false, 'client', 'relationship',false,false, true,  false, 60),
  ('820', 'Joint Lease / Tenancy Agreement',   false, 'client', 'relationship',false,true,  false, false, 70),
  ('820', 'Joint Bank Account Statements',     false, 'client', 'relationship',false,true,  false, false, 80),
  ('820', 'Shared Bills and Utilities',        false, 'client', 'relationship',false,true,  false, false, 90),
  ('820', 'Relationship Photos',               true,  'client', 'relationship',false,true,  false, false, 100),
  ('820', 'Travel Evidence',                   false, 'client', 'relationship',false,true,  false, false, 110),
  ('820', 'Communication Evidence',            false, 'client', 'relationship',false,true,  false, false, 120),
  ('820', 'Form 888 Declarations (x2 minimum)',true,  'client', 'relationship',false,true,  false, false, 130);

-- Health / Character
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, default_validity_days, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('820', 'Police Checks',                     true,  'client', 'health',    true,  365,  true,  false, false, 140),
  ('820', 'Health Assessment',                 true,  'client', 'health',    true,  365,  false, false, false, 150);

-- Internal
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('820', 'Relationship Timeline (Internal)',  true,  NULL,     'internal',  false, false, false, true,  160),
  ('820', 'Agent Notes',                       false, NULL,     'internal',  false, false, false, true,  170);

-- ── SC-309/100 Partner Visa Offshore ─────────────────────────
-- Same base docs as 820 plus offshore-specific documents

-- Identity
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('309', 'Applicant Passport',                true,  'client', 'identity',  true,  false, false, false, 10),
  ('309', 'Sponsor Passport / Citizenship Evidence', true, 'client','identity',true, false, false, false, 20),
  ('309', 'Birth Certificates',                true,  'client', 'identity',  false, true,  false, false, 30);

-- Relationship
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('309', 'Relationship Statement — Applicant',true,  'client', 'relationship',false,false, false, false, 40),
  ('309', 'Relationship Statement — Sponsor',  true,  'client', 'relationship',false,false, false, false, 50),
  ('309', 'Marriage Certificate',              false, 'client', 'relationship',false,false, true,  false, 60),
  ('309', 'Joint Bank Account Statements',     false, 'client', 'relationship',false,true,  false, false, 70),
  ('309', 'Shared Bills and Utilities',        false, 'client', 'relationship',false,true,  false, false, 80),
  ('309', 'Relationship Photos',               true,  'client', 'relationship',false,true,  false, false, 90),
  ('309', 'Form 888 Declarations (x2 minimum)',true,  'client', 'relationship',false,true,  false, false, 100);

-- Offshore-specific relationship
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('309', 'Long-Distance Communication Evidence', true, 'client','relationship',false,true, false, false, 110),
  ('309', 'Travel and Visit Evidence',         true,  'client', 'relationship',false,true,  false, false, 120),
  ('309', 'Future Plans Evidence',             false, 'client', 'relationship',false,false, false, false, 130),
  ('309', 'Offshore Residence Evidence',       false, 'client', 'relationship',false,false, false, false, 140),
  ('309', 'Dependent Child Documents',         false, 'client', 'relationship',false,true,  true,  false, 150);

-- Health / Character
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, default_validity_days, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('309', 'Police Checks',                     true,  'client', 'health',    true,  365,  true,  false, false, 160),
  ('309', 'Overseas Police Checks',            true,  'client', 'health',    true,  365,  true,  false, false, 170),
  ('309', 'Health Assessment',                 true,  'client', 'health',    true,  365,  false, false, false, 180);

-- Internal
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('309', 'Relationship Timeline (Internal)',  true,  NULL,     'internal',  false, false, false, true,  190),
  ('309', 'Agent Notes',                       false, NULL,     'internal',  false, false, false, true,  200);

-- ── SC-485 Temporary Graduate ─────────────────────────────────

-- Education
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('485', 'Course Completion Letter',          true,  'client', 'education', false, false, false, false, 10),
  ('485', 'Academic Transcripts',              true,  'client', 'education', false, true,  false, false, 20),
  ('485', 'CoE History',                       true,  'client', 'education', false, true,  false, false, 30),
  ('485', 'Australian Study Evidence',         false, 'client', 'education', false, false, false, false, 40);

-- Identity
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('485', 'Passport',                          true,  'client', 'identity',  true,  false, false, false, 50);

-- Visa Requirements
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, default_validity_days, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('485', 'AFP Check',                         true,  'client', 'legal',     true,  365,  false, false, false, 60),
  ('485', 'English Language Test Results',     true,  'client', 'legal',     true,  730,  false, false, false, 70),
  ('485', 'Health Insurance Evidence',         true,  'client', 'legal',     true,  NULL, false, false, false, 80),
  ('485', 'Skills Assessment',                 false, 'client', 'legal',     false, NULL, false, true,  false, 90),
  ('485', 'Partner / Dependent Documents',     false, 'client', 'legal',     false, NULL, true,  true,  false, 100);

-- ── SC-600 Visitor Visa ──────────────────────────────────────

-- Identity
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('600', 'Passport',                          true,  'client', 'identity',  true,  false, false, false, 10);

-- Purpose of Visit
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('600', 'Invitation Letter',                 false, 'client', 'legal',     false, false, true,  false, 20),
  ('600', 'Travel Itinerary',                  false, 'client', 'legal',     false, false, false, false, 30),
  ('600', 'Accommodation Evidence',            false, 'client', 'legal',     false, false, false, false, 40),
  ('600', 'Business Documents',               false, 'client', 'legal',     false, false, true,  false, 50);

-- Financial
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('600', 'Bank Statements',                   true,  'client', 'financial', false, true,  false, false, 60),
  ('600', 'Employment Letter',                 false, 'client', 'financial', false, false, false, false, 70),
  ('600', 'Payslips',                          false, 'client', 'financial', false, true,  false, false, 80),
  ('600', 'Tax Returns',                       false, 'client', 'financial', false, false, false, false, 90);

-- Ties to Home Country
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('600', 'Property Evidence',                 false, 'client', 'legal',     false, false, false, false, 100),
  ('600', 'Family Ties Evidence',              false, 'client', 'legal',     false, false, false, false, 110),
  ('600', 'Employment Ties Evidence',          false, 'client', 'legal',     false, false, false, false, 120);

-- Sponsor (family stream)
INSERT INTO document_types (visa_subclass, label, is_required, portal_upload, category, sponsor_visible, tracks_expiry, multiple_files_allowed, conditional, internal_only, sort_order) VALUES
  ('600', 'Sponsor Identity Document',         false, 'sponsor','identity',  true,  false, false, true,  false, 130),
  ('600', 'Sponsor Financial Evidence',        false, 'sponsor','financial', true,  false, false, true,  false, 140);
