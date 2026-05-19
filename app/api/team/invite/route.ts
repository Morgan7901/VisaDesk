import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@visadesk.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://visadesk.app";

export async function POST(request: Request) {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  if (profile.role !== "firm_admin") {
    return NextResponse.json({ error: "Only firm admins can invite team members." }, { status: 403 });
  }

  const { email, role } = await request.json();

  if (!email || !role) {
    return NextResponse.json({ error: "email and role are required." }, { status: 400 });
  }

  const validRoles = ["agent", "finance", "staff"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role. Must be agent, finance, or staff." }, { status: 400 });
  }

  // Fetch firm name for the email
  const { data: firm } = await supabaseAdmin
    .from("firms")
    .select("name")
    .eq("id", profile.firm_id)
    .single();

  const firmName = firm?.name ?? "your firm";

  // Create the invitation record
  const { data: invitation, error: inviteErr } = await supabaseAdmin
    .from("team_invitations")
    .insert({
      firm_id:    profile.firm_id,
      email,
      role,
      invited_by: user.id,
    })
    .select("id, token, email, role, sent_at, expires_at")
    .single();

  if (inviteErr || !invitation) {
    return NextResponse.json(
      { error: inviteErr?.message ?? "Failed to create invitation." },
      { status: 500 }
    );
  }

  // Send invitation email via Resend (lazily initialised so missing key doesn't crash module load)
  const resend = new Resend(process.env.RESEND_API_KEY ?? "no-key");
  const inviteUrl = `${APP_URL}/join/${invitation.token}`;
  const inviterName = profile.full_name ?? "A team member";
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You've been invited to join ${firmName} on VisaDesk`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1e293b;">
          <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">You've been invited to VisaDesk</h1>
          <p style="color: #64748b; margin: 0 0 24px; font-size: 15px;">
            ${inviterName} has invited you to join <strong>${firmName}</strong> as a <strong>${roleName}</strong>.
          </p>
          <a href="${inviteUrl}"
             style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none;
                    padding: 12px 24px; font-size: 14px; font-weight: 600; letter-spacing: 0.01em;">
            Accept Invitation
          </a>
          <p style="color: #94a3b8; margin: 24px 0 0; font-size: 13px;">
            This invitation expires in 7 days. If you did not expect this email, you can safely ignore it.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          <p style="color: #cbd5e1; font-size: 12px; margin: 0;">VisaDesk · Australian Migration Case Management</p>
        </div>
      `,
    });
  } catch (emailErr) {
    // Don't fail the whole request if email fails — invitation is still created
    console.error("[team/invite] Resend error:", emailErr);
  }

  return NextResponse.json({ invitation });
}
