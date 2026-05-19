import { supabaseAdmin } from "./admin";

// ── Types ────────────────────────────────────────────────────────────────────

export type PortalType = "client" | "sponsor";

export interface PortalFirm {
  name: string;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
}

export interface PortalCase {
  id: string;
  ref_number: string | null;
  visa_subclass: string;
  visa_stream: string | null;
  status: string;
  grant_date: string | null;
  visa_expiry: string | null;
  notes: string | null;
}

export interface PortalStage {
  id: string;
  stage_order: number;
  label: string;
  is_complete: boolean;
  is_current: boolean;
}

export interface PortalDocument {
  id: string;
  label: string;
  is_required: boolean;
  status: string; // pending | uploaded | approved | rejected
  file_name: string | null;
  uploaded_at: string | null;
  review_notes: string | null;
}

export interface PortalMessage {
  id: string;
  direction: string; // "sent" (agent→client) | "received" (client→agent)
  body: string;
  author_name: string | null;
  created_at: string;
}

export interface ClientPortalData {
  type: "client";
  entity: {
    id: string;
    full_name: string;
    email: string | null;
    nationality: string | null;
    passport_number: string | null;
    passport_expiry: string | null;
    portal_token: string;
  };
  caseData: PortalCase;
  stages: PortalStage[];
  documents: PortalDocument[];
  messages: PortalMessage[];
  firm: PortalFirm;
}

export interface SponsorPortalData {
  type: "sponsor";
  entity: {
    id: string;
    company_name: string;
    contact_name: string | null;
    contact_email: string | null;
    sbs_status: string | null;
    sbs_expiry: string | null;
    portal_token: string;
  };
  caseData: PortalCase;
  stages: PortalStage[];
  documents: PortalDocument[];
  messages: PortalMessage[];
  firm: PortalFirm;
}

export type PortalData = ClientPortalData | SponsorPortalData;

// ── Public entry point ───────────────────────────────────────────────────────

export async function getPortalCase(
  token: string,
  portalType: PortalType
): Promise<PortalData | null> {
  return portalType === "client"
    ? getClientPortalData(token)
    : getSponsorPortalData(token);
}

// ── Client portal ────────────────────────────────────────────────────────────

async function getClientPortalData(token: string): Promise<ClientPortalData | null> {
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select(
      "id, firm_id, full_name, email, nationality, passport_number, passport_expiry, portal_token, portal_active"
    )
    .eq("portal_token", token)
    .eq("portal_active", true)
    .single();

  if (!client) return null;

  const caseRow = await resolveCase("client_id", client.id, client.firm_id);
  if (!caseRow) return null;

  const [firm, stages, documents, messages] = await Promise.all([
    getFirm(client.firm_id),
    getPortalStages(caseRow.visa_subclass, client.firm_id, caseRow.id, caseRow.current_stage_id),
    getPortalDocuments(caseRow.id, "client"),
    getPortalMessages(caseRow.id),
  ]);

  if (!firm) return null;

  return {
    type: "client",
    entity: {
      id: client.id,
      full_name: client.full_name,
      email: client.email,
      nationality: client.nationality,
      passport_number: client.passport_number,
      passport_expiry: client.passport_expiry,
      portal_token: client.portal_token,
    },
    caseData: pickCase(caseRow),
    stages,
    documents,
    messages,
    firm,
  };
}

// ── Sponsor portal ───────────────────────────────────────────────────────────

async function getSponsorPortalData(token: string): Promise<SponsorPortalData | null> {
  const { data: sponsor } = await supabaseAdmin
    .from("sponsors")
    .select(
      "id, firm_id, company_name, contact_name, contact_email, sbs_status, sbs_expiry, portal_token, portal_active"
    )
    .eq("portal_token", token)
    .eq("portal_active", true)
    .single();

  if (!sponsor) return null;

  const caseRow = await resolveCase("sponsor_id", sponsor.id, sponsor.firm_id);
  if (!caseRow) return null;

  const [firm, stages, documents, messages] = await Promise.all([
    getFirm(sponsor.firm_id),
    getPortalStages(caseRow.visa_subclass, sponsor.firm_id, caseRow.id, caseRow.current_stage_id),
    getPortalDocuments(caseRow.id, "sponsor"),
    getPortalMessages(caseRow.id),
  ]);

  if (!firm) return null;

  return {
    type: "sponsor",
    entity: {
      id: sponsor.id,
      company_name: sponsor.company_name,
      contact_name: sponsor.contact_name,
      contact_email: sponsor.contact_email,
      sbs_status: sponsor.sbs_status,
      sbs_expiry: sponsor.sbs_expiry,
      portal_token: sponsor.portal_token,
    },
    caseData: pickCase(caseRow),
    stages,
    documents,
    messages,
    firm,
  };
}

// ── Shared helpers ───────────────────────────────────────────────────────────

type CaseRow = {
  id: string;
  ref_number: string | null;
  visa_subclass: string;
  visa_stream: string | null;
  status: string;
  grant_date: string | null;
  visa_expiry: string | null;
  notes: string | null;
  current_stage_id: string | null;
};

async function resolveCase(
  foreignKey: "client_id" | "sponsor_id",
  entityId: string,
  firmId: string
): Promise<CaseRow | null> {
  const SELECT =
    "id, ref_number, visa_subclass, visa_stream, status, grant_date, visa_expiry, notes, current_stage_id";

  // Prefer active/submitted
  const { data: active } = await supabaseAdmin
    .from("cases")
    .select(SELECT)
    .eq(foreignKey, entityId)
    .eq("firm_id", firmId)
    .in("status", ["active", "submitted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) return active as CaseRow;

  const { data: fallback } = await supabaseAdmin
    .from("cases")
    .select(SELECT)
    .eq(foreignKey, entityId)
    .eq("firm_id", firmId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (fallback as CaseRow) ?? null;
}

function pickCase(r: CaseRow): PortalCase {
  return {
    id: r.id,
    ref_number: r.ref_number,
    visa_subclass: r.visa_subclass,
    visa_stream: r.visa_stream,
    status: r.status,
    grant_date: r.grant_date,
    visa_expiry: r.visa_expiry,
    notes: r.notes,
  };
}

async function getFirm(firmId: string): Promise<PortalFirm | null> {
  const { data } = await supabaseAdmin
    .from("firms")
    .select("name, logo_url, email, phone")
    .eq("id", firmId)
    .single();
  return data ?? null;
}

async function getPortalStages(
  visaSubclass: string,
  firmId: string,
  caseId: string,
  currentStageId: string | null
): Promise<PortalStage[]> {
  // Prefer firm-specific template, fall back to global
  const { data: firmTpl } = await supabaseAdmin
    .from("workflow_templates")
    .select("id")
    .eq("visa_subclass", visaSubclass)
    .eq("firm_id", firmId)
    .maybeSingle();

  let templateId = firmTpl?.id ?? null;

  if (!templateId) {
    const { data: globalTpl } = await supabaseAdmin
      .from("workflow_templates")
      .select("id")
      .eq("visa_subclass", visaSubclass)
      .is("firm_id", null)
      .maybeSingle();
    templateId = globalTpl?.id ?? null;
  }

  if (!templateId) return [];

  const { data: stages } = await supabaseAdmin
    .from("workflow_stages")
    .select("id, stage_order, label")
    .eq("template_id", templateId)
    .order("stage_order");

  if (!stages?.length) return [];

  const { data: progress } = await supabaseAdmin
    .from("case_stage_progress")
    .select("stage_id, is_complete")
    .eq("case_id", caseId);

  const progressMap = new Map(progress?.map((p) => [p.stage_id, p.is_complete]) ?? []);

  return stages.map((s) => ({
    id: s.id,
    stage_order: s.stage_order,
    label: s.label,
    is_complete: progressMap.get(s.id) ?? false,
    is_current: s.id === currentStageId,
  }));
}

async function getPortalDocuments(
  caseId: string,
  portalType: PortalType
): Promise<PortalDocument[]> {
  // Filter on portal_upload stored directly on the case_document row (denormalised from
  // document_types at insert time). Also join document_types for is_required — use the
  // plain table name without an FK hint so PostgREST resolves it unambiguously.
  const { data: docs } = await supabaseAdmin
    .from("case_documents")
    .select(
      "id, label, status, file_name, uploaded_at, review_notes, document_types(is_required)"
    )
    .eq("case_id", caseId)
    .eq("portal_upload", portalType);

  if (!docs) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return docs.map((d: any) => {
    const dt = Array.isArray(d.document_types) ? d.document_types[0] : d.document_types;
    return {
      id: d.id,
      label: d.label,
      is_required: dt?.is_required ?? true,
      status: d.status ?? "pending",
      file_name: d.file_name ?? null,
      uploaded_at: d.uploaded_at ?? null,
      review_notes: d.review_notes ?? null,
    };
  });
}

async function getPortalMessages(caseId: string): Promise<PortalMessage[]> {
  const { data: comms } = await supabaseAdmin
    .from("communications")
    .select("id, direction, body, created_at, author:profiles!author_id(full_name)")
    .eq("case_id", caseId)
    .eq("comm_type", "portal_message")
    .neq("direction", "internal")
    .order("created_at", { ascending: true });

  if (!comms) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return comms.map((c: any) => {
    const author = Array.isArray(c.author) ? c.author[0] : c.author;
    return {
      id: c.id,
      direction: c.direction,
      body: c.body ?? "",
      author_name: author?.full_name ?? null,
      created_at: c.created_at,
    };
  });
}
