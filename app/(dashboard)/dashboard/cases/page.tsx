import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CaseTable } from "@/components/dashboard/CaseTable";
import type { CaseRow } from "@/components/dashboard/CaseTable";

export const metadata: Metadata = { title: "Cases — VisaDesk" };


export default async function CasesPage() {
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

  if (!profile?.firm_id) {
    console.log("[cases] no firm_id for user:", user.id);
    redirect("/login");
  }

  const firmId: string = profile.firm_id;
  console.log("[cases] firm_id:", firmId);

  // Primary query with FK join hints for client and agent names.
  // current_stage_id has no FK constraint; stage labels resolved separately.
  const { data: rawCases, error: casesError } = await supabaseAdmin
    .from("cases")
    .select(
      `id, ref_number, visa_subclass, status, created_at, updated_at,
       current_stage_id, client_id, agent_id,
       clients!client_id(full_name),
       agent:profiles!agent_id(full_name)`
    )
    .eq("firm_id", firmId)
    .order("updated_at", { ascending: false });

  console.log("[cases] primary query —", {
    count: rawCases?.length ?? 0,
    error: casesError ? casesError.message : null,
  });

  // If FK-join query errors, fall back to plain query + separate batch lookups
  let cases: {
    id: string;
    ref_number: string;
    visa_subclass: string;
    status: string;
    created_at: string;
    updated_at: string;
    current_stage_id: string | null;
    client_id: string | null;
    agent_id: string | null;
    clients: { full_name: string } | null;
    agent: { full_name: string } | null;
  }[];

  if (casesError || !rawCases) {
    console.log("[cases] falling back to query without FK joins");

    const { data: plain, error: plainError } = await supabaseAdmin
      .from("cases")
      .select(
        "id, ref_number, visa_subclass, status, created_at, updated_at, current_stage_id, client_id, agent_id"
      )
      .eq("firm_id", firmId)
      .order("updated_at", { ascending: false });

    console.log("[cases] fallback query —", {
      count: plain?.length ?? 0,
      error: plainError ? plainError.message : null,
    });

    const rows = plain ?? [];

    const clientIds = Array.from(
      new Set(rows.map((r) => r.client_id).filter(Boolean))
    ) as string[];
    const clientMap: Record<string, string> = {};
    if (clientIds.length) {
      const { data: clientRows } = await supabaseAdmin
        .from("clients")
        .select("id, full_name")
        .in("id", clientIds);
      clientRows?.forEach((c) => {
        clientMap[c.id] = c.full_name;
      });
    }

    const agentIds = Array.from(
      new Set(rows.map((r) => r.agent_id).filter(Boolean))
    ) as string[];
    const agentMap: Record<string, string> = {};
    if (agentIds.length) {
      const { data: agentRows } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", agentIds);
      agentRows?.forEach((a) => {
        agentMap[a.id] = a.full_name ?? "";
      });
    }

    cases = rows.map((r) => ({
      ...r,
      clients: clientMap[r.client_id ?? ""]
        ? { full_name: clientMap[r.client_id!] }
        : null,
      agent: agentMap[r.agent_id ?? ""]
        ? { full_name: agentMap[r.agent_id!] }
        : null,
    }));
  } else {
    const arr = <T,>(v: T | T[] | null): T | null =>
      Array.isArray(v) ? (v[0] ?? null) : v;

    cases = rawCases.map((c) => ({
      id: c.id,
      ref_number: c.ref_number,
      visa_subclass: c.visa_subclass,
      status: c.status,
      created_at: c.created_at,
      updated_at: c.updated_at,
      current_stage_id: c.current_stage_id ?? null,
      client_id: c.client_id ?? null,
      agent_id: c.agent_id ?? null,
      clients: arr(c.clients as { full_name: string } | { full_name: string }[] | null),
      agent: arr(c.agent as { full_name: string } | { full_name: string }[] | null),
    }));
  }

  // Batch-fetch stage labels for non-null current_stage_id values
  const stageIds = Array.from(
    new Set(cases.map((c) => c.current_stage_id).filter(Boolean))
  ) as string[];

  const stageLabels: Record<string, string> = {};
  if (stageIds.length) {
    const { data: stages } = await supabaseAdmin
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
    clients: c.clients,
    agent: c.agent,
  }));

  console.log("[cases] enriched rows:", enriched.length);

  return <CaseTable cases={enriched} />;
}
