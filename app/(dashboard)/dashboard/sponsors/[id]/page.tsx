import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SponsorProfilePage } from "@/components/dashboard/SponsorProfilePage";
import type { SponsorDetail, SponsorCase } from "@/components/dashboard/SponsorProfilePage";

export const metadata: Metadata = { title: "Sponsor — VisaDesk" };


export default async function SponsorDetailPage({
  params,
}: {
  params: { id: string };
}) {
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

  // Fetch sponsor — verify firm ownership
  const { data: raw } = await supabaseAdmin
    .from("sponsors")
    .select(
      "id, company_name, abn, contact_name, contact_email, contact_phone, sbs_status, sbs_expiry, portal_token, portal_active, created_at"
    )
    .eq("id", params.id)
    .eq("firm_id", firmId)
    .single();

  if (!raw) redirect("/dashboard/sponsors");

  // Fetch cases linked to this sponsor
  const { data: rawCases } = await supabaseAdmin
    .from("cases")
    .select("id, ref_number, visa_subclass, status, current_stage_id, created_at, clients!client_id(full_name)")
    .eq("sponsor_id", params.id)
    .eq("firm_id", firmId)
    .order("created_at", { ascending: false });

  // Resolve stage labels
  const stageIds = (rawCases ?? [])
    .map((c) => c.current_stage_id)
    .filter(Boolean) as string[];

  const stageLabels: Record<string, string> = {};
  if (stageIds.length > 0) {
    const { data: stages } = await supabaseAdmin
      .from("workflow_stages")
      .select("id, label")
      .in("id", stageIds);
    (stages ?? []).forEach((s) => { stageLabels[s.id] = s.label; });
  }

  const sponsor: SponsorDetail = {
    id: raw.id,
    company_name: raw.company_name,
    abn: raw.abn ?? null,
    contact_name: raw.contact_name ?? null,
    contact_email: raw.contact_email ?? null,
    contact_phone: raw.contact_phone ?? null,
    sbs_status: raw.sbs_status ?? null,
    sbs_expiry: raw.sbs_expiry ?? null,
    portal_token: raw.portal_token ?? null,
    portal_active: raw.portal_active ?? false,
    created_at: raw.created_at,
  };

  const cases: SponsorCase[] = (rawCases ?? []).map((c) => {
    // Normalise the join: clients!client_id returns an object or array
    const clientJoin = c.clients as { full_name: string } | { full_name: string }[] | null;
    let clientName: string | null = null;
    if (Array.isArray(clientJoin)) {
      clientName = clientJoin[0]?.full_name ?? null;
    } else if (clientJoin && typeof clientJoin === "object") {
      clientName = clientJoin.full_name ?? null;
    }

    return {
      id: c.id,
      ref_number: c.ref_number ?? null,
      visa_subclass: c.visa_subclass,
      status: c.status,
      client_name: clientName,
      current_stage_label: c.current_stage_id ? (stageLabels[c.current_stage_id] ?? null) : null,
      created_at: c.created_at,
    };
  });

  return <SponsorProfilePage sponsor={sponsor} cases={cases} />;
}
