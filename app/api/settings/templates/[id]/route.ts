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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthenticatedFirmId();
  if (auth instanceof NextResponse) return auth;
  const { firmId } = auth;

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from("case_templates")
    .select("id, firm_id")
    .eq("id", params.id)
    .eq("firm_id", firmId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as {
    name?: string;
    visa_subclass?: string;
    description?: string | null;
    is_active?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.visa_subclass !== undefined) updates.visa_subclass = body.visa_subclass;
  if (body.description !== undefined) updates.description = body.description;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { data: template, error } = await supabaseAdmin
    .from("case_templates")
    .update(updates)
    .eq("id", params.id)
    .select("id, name, visa_subclass, description, is_system_default, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthenticatedFirmId();
  if (auth instanceof NextResponse) return auth;
  const { firmId } = auth;

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from("case_templates")
    .select("id, firm_id")
    .eq("id", params.id)
    .eq("firm_id", firmId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("case_templates")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
