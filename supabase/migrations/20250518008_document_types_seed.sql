-- ============================================================
-- 008: Document types seed — SC-500 and SC-482
-- ============================================================

-- SC-500 Student Visa
insert into document_types (visa_subclass, label, is_required, portal_upload) values
  ('500', 'Passport (bio data page)',                        true,  'client'),
  ('500', 'Confirmation of Enrolment (CoE)',                 true,  'client'),
  ('500', 'OSHC insurance policy',                           true,  'client'),
  ('500', 'English language test results',                   true,  'client'),
  ('500', 'Financial evidence (bank statements)',            true,  'client'),
  ('500', 'Health assessment (HAP)',                         true,  'client'),
  ('500', 'National police clearance',                       true,  'client'),
  ('500', 'GS Statement',                                    true,  'client'),
  ('500', 'Visa application form (Form 157A)',               true,  null);

-- SC-482 Temporary Skill Shortage Visa
insert into document_types (visa_subclass, label, is_required, portal_upload) values
  ('482', 'Worker passport',                                 true,  'client'),
  ('482', 'Skills assessment certificate',                   true,  'client'),
  ('482', 'English language evidence',                       true,  'client'),
  ('482', 'Employment reference letters',                    true,  'client'),
  ('482', 'Health assessment',                               true,  'client'),
  ('482', 'Police clearance',                                true,  'client'),
  ('482', 'Position description',                            true,  'sponsor'),
  ('482', 'Company financials (2 years)',                    true,  'sponsor'),
  ('482', 'Training records',                                true,  'sponsor'),
  ('482', 'Labour market testing evidence',                  true,  null),
  ('482', 'Nomination form (Form 1395)',                     true,  null),
  ('482', 'Visa application form (Form 1066)',               true,  null);
