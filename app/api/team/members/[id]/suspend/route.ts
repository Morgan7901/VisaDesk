import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  if (profile.role !== "firm_admin") {
    return NextResponse.json({ error: "Only firm admins can suspend members." }, { status: 403 });
  }

  if (params.id === user.id) {
    return NextResponse.json({ error: "You cannot suspend your own account." }, { status: 400 });
  }

  const { suspended } = await request.json();
  if (typeof suspended !== "boolean") {
    return NextResponse.json({ error: "suspended must be a boolean." }, { status: 400 });
  }

  // Verify target member belongs to the same firm
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("id, firm_id")
    .eq("id", params.id)
    .single();

  if (!target || target.firm_id !== profile.firm_id) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("profiles")
    .update({ suspended })
    .eq("id", params.id)
    .select("id, suspended")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
