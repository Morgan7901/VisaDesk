import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkflowEngine } from "@/components/cases/WorkflowEngine";

export default async function WorkflowPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caseRow } = await supabase
    .from("cases")
    .select("visa_subclass")
    .eq("id", params.id)
    .single();

  if (!caseRow) redirect("/dashboard/cases");

  return (
    <WorkflowEngine caseId={params.id} visaSubclass={caseRow.visa_subclass} />
  );
}
