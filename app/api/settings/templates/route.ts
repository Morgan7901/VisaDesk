import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

async function getAuthenticatedFirmId(): Promise<{ firmId: string } | NextResponse> {
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

  return { firmId: profile.firm_id };
}

export async function GET() {
  const auth = await getAuthenticatedFirmId();
  if (auth instanceof NextResponse) return auth;
  const { firmId } = auth;

  const { data: templates, error } = await supabaseAdmin
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
    .or(`firm_id.eq.${firmId},is_system_default.eq.true`)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Normalise nested arrays
  const normalised = (templates ?? []).map((t) => ({
    ...t,
    sections: (Array.isArray(t.case_template_sections)
      ? t.case_template_sections
      : t.case_template_sections
        ? [t.case_template_sections]
        : []
    ).map((s: Record<string, unknown>) => ({
      ...s,
      fields: (Array.isArray(s.case_template_fields)
        ? s.case_template_fields
        : s.case_template_fields
          ? [s.case_template_fields]
          : []
      ),
    })),
  }));

  return NextResponse.json({ templates: normalised });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedFirmId();
  if (auth instanceof NextResponse) return auth;
  const { firmId } = auth;

  const body = await request.json().catch(() => ({})) as {
    visa_subclass?: string;
    name?: string;
    description?: string;
  };

  const { visa_subclass, name, description } = body;
  if (!visa_subclass || !name) {
    return NextResponse.json(
      { error: "visa_subclass and name are required." },
      { status: 400 }
    );
  }

  const { data: template, error } = await supabaseAdmin
    .from("case_templates")
    .insert({
      firm_id: firmId,
      visa_subclass,
      name,
      description: description ?? null,
      is_system_default: false,
      is_active: true,
    })
    .select("id, name, visa_subclass, description, is_system_default, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: { ...template, sections: [] } }, { status: 201 });
}
