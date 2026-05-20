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

  const owned = await verifyOwnership(params.id, profile.firm_id);
  if (!owned) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as {
    title?: string;
    display_order?: number;
  };

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.display_order !== undefined) updates.display_order = body.display_order;

  const { data: section, error } = await supabaseAdmin
    .from("case_template_sections")
    .update(updates)
    .eq("id", params.sectionId)
    .select("id, title, section_key, display_order")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ section });
}

export async function DELETE(
  _request: Request,
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

  const owned = await verifyOwnership(params.id, profile.firm_id);
  if (!owned) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("case_template_sections")
    .delete()
    .eq("id", params.sectionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
