import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CaseHeader } from "@/components/cases/CaseHeader";
import { CaseTabs } from "@/components/cases/CaseTabs";
import type { CaseDetailData } from "@/components/cases/CaseHeader";


export default async function CaseDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  // Auth via session client — admin client does not hold session context
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) redirect("/login");

  // Fetch firm_id via admin client to bypass RLS on profiles
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) redirect("/login");

  // Fetch case via admin client — bypass RLS, verify firm ownership explicitly
  const { data: raw } = await supabaseAdmin
    .from("cases")
    .select(
      `id, ref_number, visa_subclass, visa_stream, status,
       current_stage_id, lodgement_date, trn, grant_date, visa_expiry, notes,
       clients!client_id(full_name, email, phone, nationality, passport_number, passport_expiry),
       sponsor:sponsors!sponsor_id(company_name, contact_name, contact_email),
       agent:profiles!agent_id(full_name, email)`
    )
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!raw) redirect("/dashboard/cases");

  // Resolve current stage label (current_stage_id has no FK constraint)
  let currentStageLabel: string | null = null;
  if (raw.current_stage_id) {
    const { data: stage } = await supabaseAdmin
      .from("workflow_stages")
      .select("label")
      .eq("id", raw.current_stage_id)
      .single();
    currentStageLabel = stage?.label ?? null;
  }

  // Normalise array joins to single objects
  const arr = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const caseData: CaseDetailData = {
    id: raw.id,
    ref_number: raw.ref_number,
    visa_subclass: raw.visa_subclass,
    visa_stream: raw.visa_stream,
    status: raw.status,
    lodgement_date: raw.lodgement_date,
    trn: raw.trn,
    grant_date: raw.grant_date,
    visa_expiry: raw.visa_expiry,
    notes: raw.notes,
    current_stage_label: currentStageLabel,
    clients: arr(raw.clients as CaseDetailData["clients"] | CaseDetailData["clients"][] | null),
    sponsor: arr(raw.sponsor as CaseDetailData["sponsor"] | CaseDetailData["sponsor"][] | null),
    agent: arr(raw.agent as CaseDetailData["agent"] | CaseDetailData["agent"][] | null),
  };

  // Comms count for the tab badge — lightweight count query
  const { count: commCount } = await supabaseAdmin
    .from("communications")
    .select("id", { count: "exact", head: true })
    .eq("case_id", params.id);

  return (
    // -mx-6 -mt-6 cancels the parent dashboard layout's p-6 so header spans full width
    <div className="-mx-6 -mt-6">
      <CaseHeader caseData={caseData} />
      <CaseTabs caseId={params.id} commCount={commCount ?? 0} />
      <div className="p-6">{children}</div>
    </div>
  );
}
