import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// POST /api/cases/[id]/documents/request-message
// Generates AI document request messages for missing/rejected documents.
// Returns messages for client and/or sponsor.

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;

  console.log("[request-message] caseId:", caseId);

  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  // Fetch case — simple query, no nested joins
  const { data: caseRow, error: caseErr } = await supabaseAdmin
    .from("cases")
    .select("id, ref_number, visa_subclass, client_id, sponsor_id, current_stage_id")
    .eq("id", caseId)
    .eq("firm_id", profile.firm_id)
    .single();

  console.log("[request-message] caseRow:", caseRow, "error:", caseErr?.message);

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  // Fetch related entities in parallel
  const [firmRes, clientRes, sponsorRes, stageRes] = await Promise.all([
    supabaseAdmin.from("firms").select("name").eq("id", profile.firm_id).single(),
    caseRow.client_id
      ? supabaseAdmin.from("clients").select("full_name").eq("id", caseRow.client_id).single()
      : Promise.resolve({ data: null }),
    caseRow.sponsor_id
      ? supabaseAdmin.from("sponsors").select("company_name, contact_name").eq("id", caseRow.sponsor_id).single()
      : Promise.resolve({ data: null }),
    caseRow.current_stage_id
      ? supabaseAdmin.from("workflow_stages").select("label").eq("id", caseRow.current_stage_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const firm = firmRes.data;
  const clientName = clientRes.data?.full_name ?? "Client";
  const sponsor = sponsorRes.data;
  const stageLabel = stageRes.data?.label ?? "";

  // Fetch missing/rejected documents — handle both overall_status and legacy status
  const { data: allDocs } = await supabaseAdmin
    .from("case_documents")
    .select("id, label, overall_status, status, portal_upload, review_notes")
    .eq("case_id", caseId);

  const docs = (allDocs ?? []).filter((d) => {
    const s = d.overall_status ?? (d.status === "pending" ? "missing" : d.status);
    return s === "missing" || s === "rejected";
  });

  console.log("[request-message] total docs:", allDocs?.length, "missing/rejected:", docs.length);

  if (docs.length === 0) {
    return NextResponse.json({ error: "No missing or rejected documents found." }, { status: 400 });
  }

  // Split by who needs to upload — include agent docs in client bucket for the message
  const clientDocs = docs.filter((d) => d.portal_upload === "client" || d.portal_upload === null);
  const sponsorDocs = docs.filter((d) => d.portal_upload === "sponsor");

  const generateMessage = async (
    recipientType: "client" | "sponsor",
    recipientName: string,
    docList: Array<{ label: string; overall_status: string | null; status: string; review_notes: string | null }>
  ): Promise<string> => {
    const items = docList
      .map((d) => {
        const s = d.overall_status ?? d.status;
        if (s === "rejected" && d.review_notes) {
          return `- ${d.label} (previously rejected — reason: ${d.review_notes})`;
        }
        return `- ${d.label}`;
      })
      .join("\n");

    const prompt = `Generate a document request message for a ${caseRow.visa_subclass ? `SC-${caseRow.visa_subclass}` : ""} visa application.

${recipientType === "client" ? "Client" : "Sponsor contact"} name: ${recipientName}
Case reference: ${caseRow.ref_number ?? ""}
Agent name: ${profile.full_name}
Firm: ${firm?.name ?? ""}

Documents needed from ${recipientType === "client" ? "the applicant" : "the sponsor"}:
${items}

Additional context:
- Visa subclass: SC-${caseRow.visa_subclass ?? ""}
${stageLabel ? `- Current stage: ${stageLabel}` : ""}

Write a concise, professional message (under 200 words) that:
1. States the purpose clearly
2. Lists exactly what is needed as dot points
3. Explains how to upload via the secure portal
4. Gives a polite deadline reminder (end of week if no other context)
5. Signs off professionally from ${profile.full_name} at ${firm?.name ?? "the firm"}

Use the ${recipientType === "client" ? "client's" : "contact's"} first name. Write only the message body — no subject line, no markdown.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 600,
        system: "You are an expert Australian migration agent writing professional but friendly document request messages to visa applicants and employer sponsors.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("[request-message] Anthropic API error:", res.status, await res.text());
      return "";
    }

    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  };

  const firstName = (name: string) => name.split(" ")[0];

  const results: {
    clientMessage: string | null;
    sponsorMessage: string | null;
    clientDocs: string[];
    sponsorDocs: string[];
  } = {
    clientMessage: null,
    sponsorMessage: null,
    clientDocs: clientDocs.map((d) => d.label),
    sponsorDocs: sponsorDocs.map((d) => d.label),
  };

  if (clientDocs.length > 0) {
    results.clientMessage = await generateMessage("client", firstName(clientName), clientDocs);
  }

  if (sponsorDocs.length > 0 && sponsor) {
    const name = sponsor.contact_name ?? sponsor.company_name ?? "Team";
    results.sponsorMessage = await generateMessage("sponsor", firstName(name), sponsorDocs);
  }

  return NextResponse.json(results);
}
