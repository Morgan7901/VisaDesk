import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { DeadlinesPage } from "@/components/dashboard/DeadlinesPage";
import type { DeadlineItem, CaseOption } from "@/components/dashboard/DeadlinesPage";

export const metadata: Metadata = { title: "Deadlines — VisaDesk" };

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function DeadlinesPageRoute() {
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

  const arr = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  // Fetch all deadlines (complete + incomplete) with case + client info
  const { data: rawDeadlines } = await supabaseAdmin
    .from("deadlines")
    .select(
      `id, label, deadline_date, deadline_type, is_complete,
       cases!inner(id, ref_number, visa_subclass, clients!client_id(full_name))`
    )
    .eq("firm_id", firmId)
    .order("deadline_date", { ascending: true });

  // Fetch active cases for the "New Deadline" modal case selector
  const { data: activeCases } = await supabaseAdmin
    .from("cases")
    .select("id, ref_number, visa_subclass, clients!client_id(full_name)")
    .eq("firm_id", firmId)
    .eq("status", "active")
    .order("ref_number", { ascending: true });

  type RawCase = {
    id: string;
    ref_number: string | null;
    visa_subclass: string;
    clients: { full_name: string } | { full_name: string }[] | null;
  };

  const deadlines: DeadlineItem[] = (rawDeadlines ?? []).map((d) => {
    const caseRow = arr(d.cases as RawCase | RawCase[] | null);
    const client = arr(caseRow?.clients ?? null) as { full_name: string } | null;
    return {
      id: d.id,
      label: d.label,
      deadline_date: d.deadline_date,
      deadline_type: d.deadline_type ?? null,
      is_complete: d.is_complete ?? false,
      case_id: caseRow?.id ?? "",
      ref_number: caseRow?.ref_number ?? null,
      visa_subclass: caseRow?.visa_subclass ?? "",
      client_name: client?.full_name ?? null,
    };
  });

  const cases: CaseOption[] = (activeCases ?? []).map((c) => {
    const client = arr(c.clients as { full_name: string } | { full_name: string }[] | null) as { full_name: string } | null;
    return {
      id: c.id,
      ref_number: c.ref_number ?? "",
      visa_subclass: c.visa_subclass,
      client_name: client?.full_name ?? null,
    };
  });

  return <DeadlinesPage deadlines={deadlines} cases={cases} />;
}
