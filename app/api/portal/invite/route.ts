import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export async function POST(request: Request) {
  // 1. Auth check
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

  // 2. Parse request
  const { caseId, portalType } = await request.json() as {
    caseId: string;
    portalType: "client" | "sponsor";
  };

  if (!caseId || !["client", "sponsor"].includes(portalType)) {
    return NextResponse.json({ error: "caseId and portalType are required." }, { status: 400 });
  }

  // 3. Verify case belongs to firm
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id, client_id, sponsor_id, visa_subclass")
    .eq("id", caseId)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  // 4. Generate / retrieve portal token and activate
  let portalToken: string;
  let entityEmail: string | null = null;

  if (portalType === "client") {
    if (!caseRow.client_id) {
      return NextResponse.json({ error: "Case has no linked client." }, { status: 400 });
    }

    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("id, email, portal_token")
      .eq("id", caseRow.client_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    // Use existing token or generate a new one
    portalToken = client.portal_token ?? randomUUID();
    entityEmail = client.email;

    await supabaseAdmin
      .from("clients")
      .update({ portal_token: portalToken, portal_active: true })
      .eq("id", client.id);

  } else {
    if (!caseRow.sponsor_id) {
      return NextResponse.json({ error: "Case has no linked sponsor." }, { status: 400 });
    }

    const { data: sponsor } = await supabaseAdmin
      .from("sponsors")
      .select("id, contact_email, portal_token")
      .eq("id", caseRow.sponsor_id)
      .single();

    if (!sponsor) {
      return NextResponse.json({ error: "Sponsor not found." }, { status: 404 });
    }

    portalToken = sponsor.portal_token ?? randomUUID();
    entityEmail = sponsor.contact_email;

    await supabaseAdmin
      .from("sponsors")
      .update({ portal_token: portalToken, portal_active: true })
      .eq("id", sponsor.id);
  }

  // 5. Build portal URL
  const portalUrl = `${APP_URL}/portal/${portalType}/${portalToken}`;

  // 6. Create portal_invitations record
  await supabaseAdmin.from("portal_invitations").insert({
    case_id: caseId,
    email: entityEmail,
    portal_type: portalType,
    token: portalToken,
    accepted: false,
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // 7. Optionally send email via Resend
  if (process.env.RESEND_API_KEY && entityEmail) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      const portalLabel = portalType === "client" ? "Client Portal" : "Sponsor Portal";
      const subject = portalType === "client"
        ? "Your visa application portal is ready"
        : "Your sponsorship application portal is ready";

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@visadesk.com.au",
        to: entityEmail,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
            <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;">
              ${subject}
            </h2>
            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Your migration agent has shared a secure ${portalLabel} with you.
              Use the link below to view your application status, upload documents,
              and send messages.
            </p>
            <a href="${portalUrl}"
               style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;
                      padding:12px 24px;font-size:14px;font-weight:600;border-radius:2px;">
              Open ${portalLabel}
            </a>
            <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;">
              Keep this link private — anyone with it can access your portal.
              If you did not expect this email, please contact your migration agent.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[portal/invite] Resend error:", err);
      // Non-fatal — still return the URL
    }
  }

  return NextResponse.json({ portalUrl, token: portalToken });
}
