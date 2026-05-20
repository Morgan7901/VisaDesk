import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string; sectionId: string } }
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

  // Verify template belongs to firm
  const { data: template } = await supabaseAdmin
    .from("case_templates")
    .select("id")
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as {
    field_key?: string;
    label?: string;
    field_type?: string;
    placeholder?: string | null;
    help_text?: string | null;
    required?: boolean;
    options?: string[] | null;
    display_order?: number;
  };

  if (!body.field_key || !body.label || !body.field_type) {
    return NextResponse.json(
      { error: "field_key, label, and field_type are required." },
      { status: 400 }
    );
  }

  const { data: field, error } = await supabaseAdmin
    .from("case_template_fields")
    .insert({
      section_id: params.sectionId,
      field_key: body.field_key,
      label: body.label,
      field_type: body.field_type,
      placeholder: body.placeholder ?? null,
      help_text: body.help_text ?? null,
      required: body.required ?? false,
      options: body.options ?? null,
      display_order: body.display_order ?? 1,
    })
    .select("id, field_key, label, field_type, placeholder, help_text, required, options, display_order")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ field }, { status: 201 });
}
