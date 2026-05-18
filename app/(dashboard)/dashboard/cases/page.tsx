import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CaseTable } from "@/components/dashboard/CaseTable";
import type { CaseRow } from "@/components/dashboard/CaseTable";

export const metadata: Metadata = { title: "Cases — VisaDesk" };

export default async function CasesPage() {
  const supabase = await createClient();

  // Fetch all cases for this firm with client + agent joins.
  // current_stage_id has no FK constraint in the schema so we resolve
  // stage labels in a second query.
  const { data: rawCases } = await supabase
    .from("cases")
    .select(
      `id, ref_number, visa_subclass, status, created_at, updated_at, current_stage_id,
       clients!client_id(full_name),
       agent:profiles!agent_id(full_name)`
    )
    .order("updated_at", { ascending: false });

  const cases = rawCases ?? [];

  // Batch-fetch stage labels for any populated current_stage_id values
  const stageIds = Array.from(
    new Set(cases.map((c) => c.current_stage_id).filter(Boolean))
  ) as string[];

  const stageLabels: Record<string, string> = {};

  if (stageIds.length > 0) {
    const { data: stages } = await supabase
      .from("workflow_stages")
      .select("id, label")
      .in("id", stageIds);

    stages?.forEach((s) => {
      stageLabels[s.id] = s.label;
    });
  }

  const enriched: CaseRow[] = cases.map((c) => ({
    id: c.id,
    ref_number: c.ref_number,
    visa_subclass: c.visa_subclass,
    status: c.status,
    created_at: c.created_at,
    updated_at: c.updated_at,
    current_stage_label: c.current_stage_id
      ? (stageLabels[c.current_stage_id] ?? null)
      : null,
    clients: Array.isArray(c.clients)
      ? (c.clients[0] ?? null)
      : (c.clients as { full_name: string } | null),
    agent: Array.isArray(c.agent)
      ? (c.agent[0] ?? null)
      : (c.agent as { full_name: string } | null),
  }));

  return <CaseTable cases={enriched} />;
}
