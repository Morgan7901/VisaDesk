import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PipelinePage } from "@/components/dashboard/PipelinePage";
import type { PipelineCase } from "@/components/dashboard/PipelinePage";

export const metadata: Metadata = { title: "Pipeline — VisaDesk" };


export default async function PipelinePageRoute() {
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

  // Fetch all cases with client + agent names
  const { data: rawCases } = await supabaseAdmin
    .from("cases")
    .select(
      `id, ref_number, visa_subclass, status, current_stage_id, updated_at,
       clients!client_id(full_name),
       agent:profiles!agent_id(full_name)`
    )
    .eq("firm_id", firmId)
    .order("updated_at", { ascending: false });

  // Batch-fetch stage labels
  const stageIds = Array.from(
    new Set(
      (rawCases ?? []).map((c) => c.current_stage_id).filter(Boolean)
    )
  ) as string[];

  const stageLabels: Record<string, string> = {};
  if (stageIds.length > 0) {
    const { data: stages } = await supabaseAdmin
      .from("workflow_stages")
      .select("id, label")
      .in("id", stageIds);
    (stages ?? []).forEach((s) => { stageLabels[s.id] = s.label; });
  }

  const cases: PipelineCase[] = (rawCases ?? []).map((c) => {
    const client = arr(c.clients as { full_name: string } | { full_name: string }[] | null);
    const agent  = arr(c.agent  as { full_name: string } | { full_name: string }[] | null);
    return {
      id: c.id,
      ref_number: c.ref_number ?? null,
      visa_subclass: c.visa_subclass,
      status: c.status,
      current_stage_label: c.current_stage_id ? (stageLabels[c.current_stage_id] ?? null) : null,
      client_name: (client as { full_name: string } | null)?.full_name ?? null,
      agent_name:  (agent  as { full_name: string } | null)?.full_name ?? null,
      updated_at: c.updated_at,
    };
  });

  return <PipelinePage cases={cases} />;
}
