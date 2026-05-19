import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { WorkflowEngine } from "@/components/cases/WorkflowEngine";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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
    <WorkflowEngine caseId={params.id} visaSubclass={caseRow.visa_subclass} />
  );
}
