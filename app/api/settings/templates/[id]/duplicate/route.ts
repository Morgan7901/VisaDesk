import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  const firmId = profile.firm_id;

  // Fetch source template with all sections + fields
  const { data: source } = await supabaseAdmin
    .from("case_templates")
    .select(`
      id, name, visa_subclass, description, is_system_default, is_active,
      case_template_sections(
        id, title, section_key, display_order,
        case_template_fields(
          id, field_key, label, field_type, placeholder, help_text, required, options, display_order
        )
      )
    `)
    .eq("id", params.id)
    .single();

  if (!source) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  // Insert new template
  const { data: newTemplate, error: insertError } = await supabaseAdmin
    .from("case_templates")
    .insert({
      firm_id: firmId,
      name: `Copy of ${source.name}`,
      visa_subclass: source.visa_subclass,
      description: source.description,
      is_system_default: false,
      is_active: source.is_active,
    })
    .select("id, name, visa_subclass, description, is_system_default, is_active")
    .single();

  if (insertError || !newTemplate) {
    return NextResponse.json({ error: insertError?.message ?? "Duplicate failed." }, { status: 500 });
  }

  const arrOf = <T,>(v: T | T[] | null | undefined): T[] =>
    Array.isArray(v) ? v : v ? [v] : [];

  const sourceSections = arrOf(source.case_template_sections as unknown);

  // Duplicate sections + fields
  const sections = [];
  for (const section of sourceSections as Array<Record<string, unknown>>) {
    const { data: newSection, error: sectionError } = await supabaseAdmin
      .from("case_template_sections")
      .insert({
        template_id: newTemplate.id,
        title: section.title,
        section_key: section.section_key,
        display_order: section.display_order,
      })
      .select("id, title, section_key, display_order")
      .single();

    if (sectionError || !newSection) continue;

    const sourceFields = arrOf(section.case_template_fields as unknown);
    const fields = [];
    for (const field of sourceFields as Array<Record<string, unknown>>) {
      const { data: newField } = await supabaseAdmin
        .from("case_template_fields")
        .insert({
          section_id: newSection.id,
          field_key: field.field_key,
          label: field.label,
          field_type: field.field_type,
          placeholder: field.placeholder ?? null,
          help_text: field.help_text ?? null,
          required: field.required ?? false,
          options: field.options ?? null,
          display_order: field.display_order,
        })
        .select("id, field_key, label, field_type, placeholder, help_text, required, options, display_order")
        .single();

      if (newField) fields.push(newField);
    }

    sections.push({ ...newSection, fields });
  }

  return NextResponse.json({
    template: { ...newTemplate, sections },
  });
}
