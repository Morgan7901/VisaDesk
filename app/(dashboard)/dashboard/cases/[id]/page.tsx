import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CaseWorkflowTab } from "@/components/cases/CaseWorkflowTab";


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
    .select("visa_subclass")
    .eq("id", params.id)
    .single();

  if (!caseRow) redirect("/dashboard/cases");

  return (
    <CaseWorkflowTab caseId={params.id} visaSubclass={caseRow.visa_subclass} />
  );
}
