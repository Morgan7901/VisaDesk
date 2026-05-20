import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  // Fetch case
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id, visa_subclass, ref_number, status, template_id")
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  // Fetch field values
  const { data: fieldValues } = await supabaseAdmin
    .from("case_field_values")
    .select("field_key, value")
    .eq("case_id", params.id);

  const templateId = (caseRow as { template_id?: string | null }).template_id ?? null;
  let sections: unknown[] = [];

  if (templateId) {
    const { data: sectionsRaw } = await supabaseAdmin
      .from("case_template_sections")
      .select("id, title, section_key, display_order")
      .eq("template_id", templateId)
      .order("display_order", { ascending: true });

    if (sectionsRaw && sectionsRaw.length > 0) {
      const sectionIds = sectionsRaw.map((s) => s.id);
      const { data: fieldsRaw } = await supabaseAdmin
        .from("case_template_fields")
        .select("id, section_id, field_key, label, field_type, placeholder, help_text, required, options, display_order")
        .in("section_id", sectionIds)
        .order("display_order", { ascending: true });

      sections = sectionsRaw.map((s) => ({
        ...s,
        fields: (fieldsRaw ?? []).filter((f) => f.section_id === s.id),
      }));
    }
  }

  return NextResponse.json({
    case: caseRow,
    fieldValues: fieldValues ?? [],
    sections,
  });
}
