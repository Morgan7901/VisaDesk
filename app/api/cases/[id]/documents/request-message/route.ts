import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// POST /api/cases/[id]/documents/request-message
// Generates an AI document request message for missing/rejected documents.
// Returns messages for both client and sponsor (if applicable).

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;
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

  // Fetch case, client, firm
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select(`
      id, ref_number, visa_subclass,
      clients!client_id(full_name),
      sponsors!sponsor_id(company_name, contact_name),
      current_stage:workflow_stages!current_stage_id(label)
    `)
    .eq("id", caseId)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const { data: firm } = await supabaseAdmin
    .from("firms")
    .select("name")
    .eq("id", profile.firm_id)
    .single();

  // Fetch missing/rejected documents
  const { data: docs } = await supabaseAdmin
    .from("case_documents")
    .select("id, label, overall_status, portal_upload, review_notes")
    .eq("case_id", caseId)
    .in("overall_status", ["missing", "rejected"]);

  if (!docs || docs.length === 0) {
    return NextResponse.json({ error: "No missing or rejected documents found." }, { status: 400 });
  }

  // Split into client-facing and sponsor-facing
  const clientDocs = docs.filter((d) => d.portal_upload === "client");
  const sponsorDocs = docs.filter((d) => d.portal_upload === "sponsor");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientName = (() => { const c = caseRow.clients as any; return (Array.isArray(c) ? c[0] : c)?.full_name ?? "Client"; })();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sponsor = (() => { const s = caseRow.sponsors as any; return Array.isArray(s) ? s[0] : s; })();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageLabel = (() => { const st = caseRow.current_stage as any; return (Array.isArray(st) ? st[0] : st)?.label ?? ""; })();

  const generateMessage = async (
    recipientType: "client" | "sponsor",
    recipientName: string,
    docs: Array<{ label: string; overall_status: string; review_notes: string | null }>
  ): Promise<string> => {
    const docList = docs
      .map((d) => {
        if (d.overall_status === "rejected" && d.review_notes) {
          return `- ${d.label} (previously rejected — reason: ${d.review_notes})`;
        }
        return `- ${d.label}`;
      })
      .join("\n");

    const userPrompt = `Generate a document request message for a ${caseRow.visa_subclass ? `SC-${caseRow.visa_subclass}` : ""} visa application.

${recipientType === "client" ? "Client" : "Sponsor contact"} name: ${recipientName}
Case reference: ${caseRow.ref_number ?? ""}
Agent name: ${profile.full_name}
Firm: ${firm?.name ?? ""}

Missing / required documents needed from ${recipientType === "client" ? "the applicant" : "the sponsor"}:
${docList}

Additional context:
- Visa subclass: SC-${caseRow.visa_subclass ?? ""}
${stageLabel ? `- Current stage: ${stageLabel}` : ""}

Write a concise, professional message (under 200 words) that:
1. States the purpose clearly
2. Lists exactly what is needed as dot points
3. Explains how to upload via the secure client portal
4. Gives a polite deadline reminder
5. Signs off professionally from ${profile.full_name} at ${firm?.name ?? "the firm"}

Do not be overly formal. Use the ${recipientType === "client" ? "client's" : "contact's"} first name.`;

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
        system: "You are an expert Australian migration agent writing professional but friendly document request messages to visa applicants and employer sponsors. Write only the message body — no subject line, no markdown, no explanation.",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      console.error("[request-message] Anthropic API error:", res.status);
      return "";
    }

    const data = await res.json();
    const content = data.content?.[0];
    return content?.type === "text" ? content.text : "";
  };

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

  const firstName = (name: string) => name.split(" ")[0];

  if (clientDocs.length > 0) {
    results.clientMessage = await generateMessage("client", firstName(clientName), clientDocs);
  }

  if (sponsorDocs.length > 0 && sponsor) {
    const sponsorContactName = sponsor.contact_name ?? sponsor.company_name ?? "Team";
    results.sponsorMessage = await generateMessage("sponsor", firstName(sponsorContactName), sponsorDocs);
  }

  return NextResponse.json(results);
}
