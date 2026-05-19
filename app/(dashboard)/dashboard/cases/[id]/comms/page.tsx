import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CommsLog } from "@/components/comms/CommsLog";
import type { Communication } from "@/components/comms/CommsLog";


export default async function CommsPage({
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

  // Verify case belongs to firm
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id")
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) redirect("/dashboard/cases");

  const arr = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const { data: rawComms } = await supabaseAdmin
    .from("communications")
    .select(
      `id, comm_type, direction, subject, body, is_omara_logged, created_at, author_id,
       author:profiles!author_id(full_name)`
    )
    .eq("case_id", params.id)
    .order("created_at", { ascending: false });

  const communications: Communication[] = (rawComms ?? []).map((c) => {
    const author = arr(
      c.author as { full_name: string } | { full_name: string }[] | null
    );
    return {
      id: c.id,
      comm_type: c.comm_type,
      direction: c.direction,
      subject: c.subject ?? null,
      body: c.body,
      is_omara_logged: c.is_omara_logged,
      created_at: c.created_at,
      author_id: c.author_id ?? null,
      author_name: author?.full_name ?? null,
    };
  });

  return (
    <CommsLog
      caseId={params.id}
      initialComms={communications}
      currentUserId={user.id}
    />
  );
}
