import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

async function verifyOwnership(
  templateId: string,
  firmId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("case_templates")
    .select("id")
    .eq("id", templateId)
    .eq("firm_id", firmId)
    .single();
  return !!data;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; fieldId: string } }
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

  const owned = await verifyOwnership(params.id, profile.firm_id);
  if (!owned) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as {
    label?: string;
    field_type?: string;
    placeholder?: string | null;
    help_text?: string | null;
    required?: boolean;
    options?: string[] | null;
    display_order?: number;
  };

  const updates: Record<string, unknown> = {};
  if (body.label !== undefined) updates.label = body.label;
  if (body.field_type !== undefined) updates.field_type = body.field_type;
  if (body.placeholder !== undefined) updates.placeholder = body.placeholder;
  if (body.help_text !== undefined) updates.help_text = body.help_text;
  if (body.required !== undefined) updates.required = body.required;
  if (body.options !== undefined) updates.options = body.options;
  if (body.display_order !== undefined) updates.display_order = body.display_order;

  const { data: field, error } = await supabaseAdmin
    .from("case_template_fields")
    .update(updates)
    .eq("id", params.fieldId)
    .select("id, field_key, label, field_type, placeholder, help_text, required, options, display_order")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ field });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; fieldId: string } }
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

  const owned = await verifyOwnership(params.id, profile.firm_id);
  if (!owned) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("case_template_fields")
    .delete()
    .eq("id", params.fieldId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
