import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SponsorsPage } from "@/components/dashboard/SponsorsPage";
import type { SponsorRow } from "@/components/dashboard/SponsorsPage";

export const metadata: Metadata = { title: "Sponsors — VisaDesk" };

export default async function SponsorsPageRoute() {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) redirect("/login");

  const firmId: string = profile.firm_id;

  // Fetch all sponsors for this firm
  const { data: rawSponsors } = await supabaseAdmin
    .from("sponsors")
    .select("id, company_name, abn, contact_name, contact_email, sbs_status, sbs_expiry, portal_active")
    .eq("firm_id", firmId)
    .order("company_name", { ascending: true });

  // Fetch case counts per sponsor in one query
  const sponsorIds = (rawSponsors ?? []).map((s) => s.id);
  const caseCounts: Record<string, number> = {};

  if (sponsorIds.length > 0) {
    const { data: cases } = await supabaseAdmin
      .from("cases")
      .select("sponsor_id")
      .in("sponsor_id", sponsorIds)
      .eq("firm_id", firmId);

    (cases ?? []).forEach((c) => {
      if (c.sponsor_id) {
        caseCounts[c.sponsor_id] = (caseCounts[c.sponsor_id] ?? 0) + 1;
      }
    });
  }

  const sponsors: SponsorRow[] = (rawSponsors ?? []).map((s) => ({
    id: s.id,
    company_name: s.company_name,
    abn: s.abn ?? null,
    contact_name: s.contact_name ?? null,
    contact_email: s.contact_email ?? null,
    sbs_status: s.sbs_status ?? null,
    sbs_expiry: s.sbs_expiry ?? null,
    portal_active: s.portal_active ?? false,
    case_count: caseCounts[s.id] ?? 0,
  }));

  return <SponsorsPage sponsors={sponsors} />;
}
