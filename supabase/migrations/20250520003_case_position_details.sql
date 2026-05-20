ALTER TABLE cases ADD COLUMN IF NOT EXISTS position_title text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS anzsco_code text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS salary decimal(10,2);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS work_location text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS lmt_exempt boolean default false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS lmt_exempt_reason text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS skills_assessment_body text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS skills_assessment_status text;
