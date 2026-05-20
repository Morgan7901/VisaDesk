CREATE TABLE case_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES firms(id),
  visa_subclass text NOT NULL,
  name text NOT NULL,
  description text,
  is_system_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE case_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES case_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  section_key text NOT NULL,
  description text,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE case_template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES case_templates(id) ON DELETE CASCADE,
  section_id uuid REFERENCES case_template_sections(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL,
  placeholder text,
  help_text text,
  required boolean DEFAULT false,
  options jsonb,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE case_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  value jsonb,
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(case_id, field_key)
);

ALTER TABLE cases ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES case_templates(id);

ALTER TABLE case_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates readable by authenticated" ON case_templates
  FOR SELECT TO authenticated
  USING (is_system_default = true OR firm_id = get_my_firm_id());

CREATE POLICY "Firm can manage own templates" ON case_templates
  FOR ALL TO authenticated
  USING (firm_id = get_my_firm_id());

CREATE POLICY "Template sections readable" ON case_template_sections
  FOR SELECT TO authenticated
  USING (
    template_id IN (
      SELECT id FROM case_templates
      WHERE is_system_default = true OR firm_id = get_my_firm_id()
    )
  );

CREATE POLICY "Template fields readable" ON case_template_fields
  FOR SELECT TO authenticated
  USING (
    template_id IN (
      SELECT id FROM case_templates
      WHERE is_system_default = true OR firm_id = get_my_firm_id()
    )
  );

CREATE POLICY "Case field values firm scoped" ON case_field_values
  FOR ALL TO authenticated
  USING (
    case_id IN (
      SELECT id FROM cases WHERE firm_id = get_my_firm_id()
    )
  );

GRANT ALL ON case_templates TO service_role;
GRANT ALL ON case_template_sections TO service_role;
GRANT ALL ON case_template_fields TO service_role;
GRANT ALL ON case_field_values TO service_role;
