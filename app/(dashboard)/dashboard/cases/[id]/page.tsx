import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CaseOverview } from "@/components/cases/CaseOverview";
import { SC500Overview } from "@/components/cases/SC500Overview";

interface SectionField {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  placeholder: string | null;
  help_text: string | null;
  required: boolean;
  options: string[] | null;
  display_order: number;
}

interface Section {
  id: string;
  title: string;
  section_key: string;
  display_order: number;
  fields: SectionField[];
}

export default async function CaseOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = await params;

  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) redirect("/login");

  // Fetch case
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id, visa_subclass, ref_number, status, template_id, lodgement_date, grant_date, visa_expiry, trn, current_stage_id, client_id, agent_id")
    .eq("id", caseId)
    .single();

  if (!caseRow) redirect("/dashboard/cases");

  // Fetch case field values
  const { data: fieldValuesRaw } = await supabaseAdmin
    .from("case_field_values")
    .select("field_key, value")
    .eq("case_id", caseId);

  const fieldValues: Record<string, unknown> = {};
  if (fieldValuesRaw) {
    for (const row of fieldValuesRaw) {
      fieldValues[row.field_key] = row.value;
    }
  }

  // ── SC-500 specific path ──────────────────────────────────────────────────
  if (caseRow.visa_subclass === "500") {
    const caseTyped = caseRow as {
      id: string;
      visa_subclass: string;
      ref_number: string | null;
      status: string;
      template_id: string | null;
      lodgement_date: string | null;
      grant_date: string | null;
      visa_expiry: string | null;
      trn: string | null;
      current_stage_id: string | null;
      client_id: string | null;
      agent_id: string | null;
    };

    // Fetch client, agent, stage label, doc count, AI doc count in parallel
    const [clientResult, agentResult, stageResult, docCountResult, aiDocCountResult] = await Promise.all([
      caseTyped.client_id
        ? supabaseAdmin
            .from("clients")
            .select("full_name, nationality, passport_expiry")
            .eq("id", caseTyped.client_id)
            .single()
        : Promise.resolve({ data: null }),
      caseTyped.agent_id
        ? supabaseAdmin
            .from("profiles")
            .select("full_name")
            .eq("id", caseTyped.agent_id)
            .single()
        : Promise.resolve({ data: null }),
      caseTyped.current_stage_id
        ? supabaseAdmin
            .from("workflow_stages")
            .select("label")
            .eq("id", caseTyped.current_stage_id)
            .single()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from("case_documents")
        .select("id", { count: "exact", head: true })
        .eq("case_id", caseId),
      supabaseAdmin
        .from("ai_documents")
        .select("id", { count: "exact", head: true })
        .eq("case_id", caseId),
    ]);

    const client = clientResult.data as { full_name?: string | null; nationality?: string | null; passport_expiry?: string | null } | null;
    const agentProfile = agentResult.data as { full_name?: string | null } | null;
    const stageRow = stageResult.data as { label?: string | null } | null;

    return (
      <SC500Overview
        caseId={caseId}
        refNumber={caseTyped.ref_number}
        status={caseTyped.status ?? "draft"}
        lodgementDate={caseTyped.lodgement_date}
        grantDate={caseTyped.grant_date}
        visaExpiry={caseTyped.visa_expiry}
        currentStageLabel={stageRow?.label ?? null}
        trn={caseTyped.trn}
        clientName={client?.full_name ?? null}
        clientNationality={client?.nationality ?? null}
        clientPassportExpiry={client?.passport_expiry ?? null}
        agentName={agentProfile?.full_name ?? null}
        fieldValues={fieldValues}
        hasDocuments={(docCountResult.count ?? 0) > 0}
        aiDocCount={aiDocCountResult.count ?? 0}
      />
    );
  }

  // ── Generic path (all other visa subclasses) ──────────────────────────────
  const templateId = (caseRow as { template_id?: string | null; agent_id?: string | null }).template_id ?? null;
  let sections: Section[] = [];

  if (templateId) {
    const { data: sectionsRaw } = await supabaseAdmin
      .from("case_template_sections")
      .select("id, title, section_key, display_order")
      .eq("template_id", templateId)
      .order("display_order", { ascending: true });

    if (sectionsRaw && sectionsRaw.length > 0) {
      const sectionIds = sectionsRaw.map((s) => s.id);
      const { data: fieldsRaw } = await supabaseAdmin
        .from("case_template_fields")
        .select("id, section_id, field_key, label, field_type, placeholder, help_text, required, options, display_order")
        .in("section_id", sectionIds)
        .order("display_order", { ascending: true });

      sections = sectionsRaw.map((s) => ({
        id: s.id,
        title: s.title,
        section_key: s.section_key,
        display_order: s.display_order,
        fields: (fieldsRaw ?? [])
          .filter((f) => f.section_id === s.id)
          .map((f) => ({
            id: f.id,
            field_key: f.field_key,
            label: f.label,
            field_type: f.field_type,
            placeholder: f.placeholder ?? null,
            help_text: f.help_text ?? null,
            required: f.required ?? false,
            options: Array.isArray(f.options) ? (f.options as string[]) : null,
            display_order: f.display_order ?? 0,
          })),
      }));
    }
  }

  // Missing documents count
  const { count: pendingDocCount } = await supabaseAdmin
    .from("case_documents")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId)
    .eq("status", "pending");

  // Next deadline
  const today = new Date().toISOString().split("T")[0];
  const { data: nextDeadlineRaw } = await supabaseAdmin
    .from("deadlines")
    .select("label, deadline_date")
    .eq("case_id", caseId)
    .eq("is_complete", false)
    .gte("deadline_date", today)
    .order("deadline_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const nextDeadline = nextDeadlineRaw
    ? { label: nextDeadlineRaw.label, deadline_date: nextDeadlineRaw.deadline_date }
    : null;

  // Last communication
  const { data: lastCommRaw } = await supabaseAdmin
    .from("communications")
    .select("subject, created_at, direction")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastComm = lastCommRaw
    ? {
        subject: lastCommRaw.subject ?? null,
        created_at: lastCommRaw.created_at,
        direction: lastCommRaw.direction,
      }
    : null;

  return (
    <CaseOverview
      caseId={caseId}
      visaSubclass={caseRow.visa_subclass}
      fieldValues={fieldValues}
      sections={sections}
      pendingDocCount={pendingDocCount ?? 0}
      nextDeadline={nextDeadline}
      lastComm={lastComm}
      hasTemplate={!!templateId}
    />
  );
}
