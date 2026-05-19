import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// GET — validate the token and return invitation details (public, no auth required)
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const { data: invitation } = await supabaseAdmin
    .from("team_invitations")
    .select("id, email, role, firm_id, accepted, expires_at, firms(name)")
    .eq("token", params.token)
    .single();

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found or already used." }, { status: 404 });
  }

  if (invitation.accepted) {
    return NextResponse.json({ error: "This invitation has already been accepted." }, { status: 410 });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invitation has expired. Ask your admin to resend it." }, { status: 410 });
  }

  const arr = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const firm = arr(invitation.firms as { name: string } | { name: string }[] | null);

  return NextResponse.json({
    email: invitation.email,
    role:  invitation.role,
    firm_name: firm?.name ?? "your firm",
  });
}

// POST — create the account and mark invitation accepted
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  // Re-validate token
  const { data: invitation } = await supabaseAdmin
    .from("team_invitations")
    .select("id, email, role, firm_id, accepted, expires_at")
    .eq("token", params.token)
    .single();

  if (!invitation || invitation.accepted) {
    return NextResponse.json({ error: "Invalid or already-used invitation." }, { status: 400 });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invitation has expired." }, { status: 400 });
  }

  const { full_name, password, mara_number } = await request.json();

  if (!full_name || !password) {
    return NextResponse.json({ error: "full_name and password are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // 1. Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Could not create account." },
      { status: 400 }
    );
  }

  const userId = authData.user.id;

  // 2. Wait for the profile trigger to create the row
  const MAX_ATTEMPTS = 5;
  let profileExists = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existing) { profileExists = true; break; }
    await sleep(500);
  }

  if (!profileExists) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Account setup timed out. Please try again." },
      { status: 500 }
    );
  }

  // 3. Update profile with role, firm, name from invitation
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name,
      firm_id:     invitation.firm_id,
      role:        invitation.role,
      mara_number: mara_number ?? null,
    })
    .eq("id", userId);

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // 4. Mark invitation as accepted
  await supabaseAdmin
    .from("team_invitations")
    .update({ accepted: true })
    .eq("token", params.token);

  return NextResponse.json({ success: true });
}
