import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ClientProfilePage } from "@/components/dashboard/ClientProfilePage";
import type { ClientDetail, ClientCase } from "@/components/dashboard/ClientProfilePage";

export const metadata: Metadata = { title: "Client — VisaDesk" };


export default async function ClientDetailPage({
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

  // Fetch client — verify firm ownership
  const { data: raw } = await supabaseAdmin
    .from("clients")
    .select(
      "id, full_name, email, phone, date_of_birth, nationality, passport_number, passport_expiry, portal_active, created_at"
    )
    .eq("id", params.id)
    .eq("firm_id", firmId)
    .single();

  if (!raw) redirect("/dashboard/clients");

  // Fetch cases for this client
  const { data: rawCases } = await supabaseAdmin
    .from("cases")
    .select("id, ref_number, visa_subclass, status, current_stage_id, created_at")
    .eq("client_id", params.id)
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

  const client: ClientDetail = {
    id: raw.id,
    full_name: raw.full_name,
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    date_of_birth: raw.date_of_birth ?? null,
    nationality: raw.nationality ?? null,
    passport_number: raw.passport_number ?? null,
    passport_expiry: raw.passport_expiry ?? null,
    portal_active: raw.portal_active ?? false,
    created_at: raw.created_at,
  };

  const cases: ClientCase[] = (rawCases ?? []).map((c) => ({
    id: c.id,
    ref_number: c.ref_number ?? null,
    visa_subclass: c.visa_subclass,
    status: c.status,
    current_stage_label: c.current_stage_id ? (stageLabels[c.current_stage_id] ?? null) : null,
    created_at: c.created_at,
  }));

  return <ClientProfilePage client={client} cases={cases} />;
}
