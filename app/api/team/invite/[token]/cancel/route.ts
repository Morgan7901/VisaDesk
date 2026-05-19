import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: { token: string } }
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
    return NextResponse.json({ error: "Only firm admins can cancel invitations." }, { status: 403 });
  }

  const { data: invitation } = await supabaseAdmin
    .from("team_invitations")
    .select("id, firm_id")
    .eq("token", params.token)
    .single();

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  if (invitation.firm_id !== profile.firm_id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("team_invitations")
    .delete()
    .eq("token", params.token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
