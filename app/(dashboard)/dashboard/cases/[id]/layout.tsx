import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch case — RLS ensures it belongs to this user's firm
  const { data: raw } = await supabase
    .from("cases")
    .select(
      `id, ref_number, visa_subclass, visa_stream, status,
       current_stage_id, lodgement_date, trn, grant_date, visa_expiry, notes,
       clients!client_id(full_name, email, phone, nationality, passport_number, passport_expiry),
       sponsor:sponsors!sponsor_id(company_name, contact_name, contact_email),
       agent:profiles!agent_id(full_name, email)`
    )
    .eq("id", params.id)
    .single();

  if (!raw) redirect("/dashboard/cases");

  // Resolve current stage label (current_stage_id has no FK constraint)
  let currentStageLabel: string | null = null;
  if (raw.current_stage_id) {
    const { data: stage } = await supabase
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

  return (
    // -mx-6 -mt-6 cancels the parent dashboard layout's p-6 so header spans full width
    <div className="-mx-6 -mt-6">
      <CaseHeader caseData={caseData} />
      <CaseTabs caseId={params.id} />
      <div className="p-6">{children}</div>
    </div>
  );
}
