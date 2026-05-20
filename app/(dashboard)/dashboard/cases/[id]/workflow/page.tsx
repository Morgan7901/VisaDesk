import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CaseWorkflowTab } from "@/components/cases/CaseWorkflowTab";
import { PositionDetailsCard } from "@/components/cases/PositionDetailsCard";
import type { PositionDetailsData } from "@/components/cases/PositionDetailsCard";

const SPONSOR_SUBCLASSES = ["482", "186", "494"];

export default async function WorkflowPage({
  params,
}: {
  params: { id: string };
}) {
  // Auth via session client
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) redirect("/login");

  // Fetch case via admin client to bypass RLS
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select(
      `visa_subclass, position_title, anzsco_code, salary, work_location,
       lmt_exempt, lmt_exempt_reason, skills_assessment_body, skills_assessment_status`
    )
    .eq("id", params.id)
    .single();

  if (!caseRow) redirect("/dashboard/cases");

  const positionData: PositionDetailsData = {
    position_title: (caseRow as { position_title?: string | null }).position_title ?? null,
    anzsco_code: (caseRow as { anzsco_code?: string | null }).anzsco_code ?? null,
    salary: (caseRow as { salary?: number | null }).salary ?? null,
    work_location: (caseRow as { work_location?: string | null }).work_location ?? null,
    lmt_exempt: (caseRow as { lmt_exempt?: boolean | null }).lmt_exempt ?? false,
    lmt_exempt_reason: (caseRow as { lmt_exempt_reason?: string | null }).lmt_exempt_reason ?? null,
    skills_assessment_body: (caseRow as { skills_assessment_body?: string | null }).skills_assessment_body ?? null,
    skills_assessment_status: (caseRow as { skills_assessment_status?: string | null }).skills_assessment_status ?? null,
  };

  return (
    <>
      {SPONSOR_SUBCLASSES.includes(caseRow.visa_subclass) && (
        <PositionDetailsCard caseId={params.id} initialData={positionData} />
      )}
      <CaseWorkflowTab caseId={params.id} visaSubclass={caseRow.visa_subclass} />
    </>
  );
}
