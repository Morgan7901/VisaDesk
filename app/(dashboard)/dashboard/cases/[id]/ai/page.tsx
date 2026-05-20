import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AITools, type AIToolsProps } from "@/components/cases/AITools";

export default async function AIToolsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // Auth
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) redirect("/login");

  const arr = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  // Full case context — includes all fields the AI prompt builder needs
  const { data: raw } = await supabaseAdmin
    .from("cases")
    .select(
      `id, ref_number, visa_subclass, visa_stream, status, notes,
       lodgement_date, grant_date, visa_expiry, trn,
       clients!client_id(full_name, nationality, date_of_birth, passport_number, passport_expiry),
       sponsor:sponsors!sponsor_id(company_name, abn, contact_name, sbs_status),
       agent:profiles!agent_id(full_name, email, mara_number),
       firm:firms!firm_id(name, email, phone, address)`
    )
    .eq("id", id)
    .single();

  if (!raw) redirect("/dashboard/cases");

  type ClientShape  = { full_name: string; nationality: string | null; date_of_birth: string | null; passport_number: string | null; passport_expiry: string | null };
  type SponsorShape = { company_name: string; abn: string | null; contact_name: string | null; sbs_status: string | null };
  type AgentShape   = { full_name: string; email: string | null; mara_number: string | null };
  type FirmShape    = { name: string; email: string | null; phone: string | null; address: string | null };

  const client  = arr(raw.clients  as ClientShape  | ClientShape[]  | null);
  const sponsor = arr(raw.sponsor  as SponsorShape | SponsorShape[] | null);
  const agent   = arr(raw.agent    as AgentShape   | AgentShape[]   | null);
  const firm    = arr(raw.firm     as FirmShape    | FirmShape[]    | null);

  if (!client || !firm || !agent) redirect("/dashboard/cases");

  // Case documents
  const { data: rawDocs } = await supabaseAdmin
    .from("case_documents")
    .select("id, label, status")
    .eq("case_id", id);

  // Previously generated AI documents
  const { data: rawAiDocs } = await supabaseAdmin
    .from("ai_documents")
    .select("id, document_type, title, content, created_at")
    .eq("case_id", id)
    .order("created_at", { ascending: false });

  const props: AIToolsProps = {
    caseId: id,
    caseContext: {
      visa_subclass:  raw.visa_subclass,
      visa_stream:    raw.visa_stream    ?? null,
      status:         raw.status,
      notes:          raw.notes          ?? null,
      lodgement_date: raw.lodgement_date ?? null,
      grant_date:     raw.grant_date     ?? null,
      visa_expiry:    raw.visa_expiry    ?? null,
      trn:            raw.trn            ?? null,
      ref_number:     raw.ref_number     ?? null,
    },
    client: {
      full_name:       client.full_name,
      nationality:     client.nationality    ?? null,
      date_of_birth:   client.date_of_birth  ?? null,
      passport_number: client.passport_number ?? null,
      passport_expiry: client.passport_expiry ?? null,
    },
    sponsor: sponsor
      ? {
          company_name: sponsor.company_name,
          abn:          sponsor.abn          ?? null,
          contact_name: sponsor.contact_name ?? null,
          sbs_status:   sponsor.sbs_status   ?? null,
        }
      : null,
    firm: {
      name:    firm.name,
      email:   firm.email   ?? null,
      phone:   firm.phone   ?? null,
      address: firm.address ?? null,
    },
    agent: {
      full_name:    agent.full_name,
      email:        agent.email        ?? null,
      mara_number:  agent.mara_number  ?? null,
    },
    documents: (rawDocs ?? []).map((d) => ({
      id:     d.id,
      label:  d.label,
      status: d.status,
    })),
    aiDocuments: (rawAiDocs ?? []).map((d) => ({
      id:            d.id,
      document_type: d.document_type,
      title:         d.title,
      content:       d.content,
      created_at:    d.created_at,
    })),
  };

  return <AITools {...props} />;
}
