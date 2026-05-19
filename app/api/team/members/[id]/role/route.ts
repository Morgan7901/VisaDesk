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
    return NextResponse.json({ error: "Only firm admins can change roles." }, { status: 403 });
  }

  const { role: newRole } = await request.json();
  const validRoles = ["firm_admin", "agent", "finance", "staff"];
  if (!validRoles.includes(newRole)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
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
    .update({ role: newRole })
    .eq("id", params.id)
    .select("id, role")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
