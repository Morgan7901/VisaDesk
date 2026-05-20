import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aiGenerationLimit } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// ── Document attachment helpers ───────────────────────────────────────────────

interface DocAttachment {
  label: string;
  base64: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png";
}

async function readCaseDocuments(
  caseId: string,
  relevantLabels: string[]
): Promise<DocAttachment[]> {
  if (relevantLabels.length === 0) return [];

  // Fetch documents with matching labels and uploaded/approved status
  const { data: docs } = await supabaseAdmin
    .from("case_documents")
    .select("id, label, storage_path, file_name, file_size, status")
    .eq("case_id", caseId)
    .in("status", ["uploaded", "approved"])
    .not("storage_path", "is", null);

  if (!docs || docs.length === 0) return [];

  const matches = docs.filter((d) =>
    relevantLabels.some((rel) =>
      d.label.toLowerCase().includes(rel.toLowerCase()) ||
      rel.toLowerCase().includes(d.label.toLowerCase())
    )
  );

  const results: DocAttachment[] = [];

  for (const doc of matches) {
    if (!doc.storage_path) continue;
    // Skip files over 4MB
    if (doc.file_size && doc.file_size > 4_000_000) continue;

    // Determine media type from extension
    const ext = (doc.file_name ?? doc.storage_path).split(".").pop()?.toLowerCase();
    let mediaType: DocAttachment["mediaType"] | null = null;
    if (ext === "pdf") mediaType = "application/pdf";
    else if (ext === "jpg" || ext === "jpeg") mediaType = "image/jpeg";
    else if (ext === "png") mediaType = "image/png";
    else continue; // skip unsupported types

    try {
      const { data: blob, error } = await supabaseAdmin.storage
        .from("case-documents")
        .download(doc.storage_path);

      if (error || !blob) continue;

      const arrayBuffer = await blob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      results.push({ label: doc.label, base64, mediaType });
    } catch {
      // Never throw — silently skip failed downloads
      continue;
    }
  }

  return results;
}

async function fetchCaseFieldValues(caseId: string): Promise<Record<string, unknown>> {
  const { data } = await supabaseAdmin
    .from("case_field_values")
    .select("field_key, value")
    .eq("case_id", caseId);

  const map: Record<string, unknown> = {};
  for (const row of data ?? []) {
    try {
      map[row.field_key] = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
    } catch {
      map[row.field_key] = row.value;
    }
  }
  return map;
}

// ── Document relevance map ────────────────────────────────────────────────────

const DOCUMENT_LABELS: Record<string, string[]> = {
  GS_FORM_RESPONSES: [
    "Confirmation of Enrolment",
    "Financial evidence",
    "English language test results",
    "Academic transcripts",
    "Employment reference letters",
    "National police clearance",
    "OSHC insurance policy",
  ],
  GS_SUPPORTING_STATEMENT: [
    "Confirmation of Enrolment",
    "Financial evidence",
    "English language test results",
    "Academic transcripts",
    "Employment reference letters",
    "National police clearance",
    "OSHC insurance policy",
  ],
  POSITION_DESCRIPTION: [
    "Worker passport",
    "Employment reference letters",
    "Skills assessment certificate",
    "English language evidence",
  ],
  LMT_SUMMARY: ["Labour market testing evidence"],
  RELATIONSHIP_STATEMENT: [
    "Joint financial evidence",
    "Travel evidence",
    "Photos",
  ],
};

// ── Context helpers ───────────────────────────────────────────────────────────

async function fetchContext(caseId: string) {
  const arr = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  // Case + client + sponsor in one query
  const { data: raw } = await supabaseAdmin
    .from("cases")
    .select(
      `id, ref_number, visa_subclass, visa_stream, status, notes,
       lodgement_date, grant_date, visa_expiry, trn,
       position_title, anzsco_code, salary, work_location,
       lmt_exempt, lmt_exempt_reason, skills_assessment_body,
       clients!client_id(full_name, nationality, date_of_birth, passport_number, passport_expiry),
       sponsor:sponsors!sponsor_id(company_name, abn, contact_name, sbs_status),
       agent:profiles!agent_id(id, full_name, email, mara_number),
       firm:firms!firm_id(id, name, email, phone, address)`
    )
    .eq("id", caseId)
    .single();

  if (!raw) return null;

  const client = arr(raw.clients as Record<string, string | null> | Record<string, string | null>[] | null);
  const sponsor = arr(raw.sponsor as Record<string, string | null> | Record<string, string | null>[] | null);
  const agent = arr(raw.agent as Record<string, string | null> | Record<string, string | null>[] | null);
  const firm = arr(raw.firm as Record<string, string | null> | Record<string, string | null>[] | null);

  // Case documents
  const { data: docs } = await supabaseAdmin
    .from("case_documents")
    .select("label, status")
    .eq("case_id", caseId);

  const docList = (docs ?? [])
    .map((d) => `- ${d.label} (${d.status})`)
    .join("\n");

  const fieldValues = await fetchCaseFieldValues(caseId);
  return { raw, client, sponsor, agent, firm, docList, fieldValues };
}

// ── Prompt builders ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Australian migration agent assistant with deep knowledge of DHA requirements, the Migration Act 1958, and OMARA standards. Generate professional, accurate migration documents using Australian English spelling and formal legal/professional tone. All documents should be ready for agent review and comply with current Australian immigration law as of 2025-2026.`;

type Ctx = Awaited<ReturnType<typeof fetchContext>>;

function buildUserPrompt(documentType: string, ctx: NonNullable<Ctx>): string {
  const { raw, client, sponsor, agent, firm, docList, fieldValues } = ctx;

  // Build field context block for all non-null values
  const fieldContextLines: string[] = [];
  for (const [key, val] of Object.entries(fieldValues)) {
    if (val !== null && val !== undefined && val !== "" && val !== false) {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      fieldContextLines.push(`  ${label}: ${Array.isArray(val) ? val.join(", ") : String(val)}`);
    }
  }
  const fieldContext = fieldContextLines.length > 0
    ? `\nCase overview fields recorded by the agent:\n${fieldContextLines.join("\n")}\n`
    : "";

  const cn = client?.full_name ?? "[CLIENT NAME]";
  const nat = client?.nationality ?? "[NATIONALITY]";
  const dob = client?.date_of_birth ?? "[DOB]";
  const sub = raw.visa_subclass ?? "[SUBCLASS]";
  const stream = raw.visa_stream ?? "[STREAM]";
  const notes = raw.notes ?? "None provided.";
  const ref = raw.ref_number ?? "[REF NUMBER]";
  const agentName = agent?.full_name ?? "[AGENT NAME]";
  const marn = (agent as Record<string, string | null> | null)?.mara_number ?? "[MARN]";
  const firmName = firm?.name ?? "[FIRM NAME]";
  const grantDate = raw.grant_date ?? "[GRANT DATE]";
  const visaExpiry = raw.visa_expiry ?? "[VISA EXPIRY]";
  const sponsorName = sponsor?.company_name ?? "[EMPLOYER]";
  const sponsorAbn = sponsor?.abn ?? "[ABN]";
  const sponsorContact = sponsor?.contact_name ?? "[CONTACT]";

  // Position details (for 482/186/494 nominations)
  const rawPos = raw as Record<string, unknown>;
  const positionTitle = (rawPos.position_title as string | null) ?? null;
  const anzscoCode = (rawPos.anzsco_code as string | null) ?? null;
  const salary = (rawPos.salary as number | null) ?? null;
  const workLocation = (rawPos.work_location as string | null) ?? null;
  const lmtExempt = (rawPos.lmt_exempt as boolean | null) ?? false;
  const lmtExemptReason = (rawPos.lmt_exempt_reason as string | null) ?? null;
  const skillsBody = (rawPos.skills_assessment_body as string | null) ?? null;

  const positionContext = `Position Title: ${positionTitle ?? "[TBC]"}
ANZSCO Code: ${anzscoCode ?? "[TBC]"}
Annual Salary: ${salary ? `AUD ${salary.toLocaleString()}` : "[TBC — must meet TSMIT of $73,150]"}
Work Location: ${workLocation ?? "[TBC]"}
LMT Exempt: ${lmtExempt ? `Yes${lmtExemptReason ? ` (${lmtExemptReason})` : ""}` : "No"}
Skills Assessment Body: ${skillsBody ?? "[TBC]"}`;

  switch (documentType) {
    case "GS_FORM_RESPONSES":
      return `Generate answers to all 5 Genuine Student (GS) questions for an SC-500 student visa application lodged after 23 March 2024 under Ministerial Direction 106.

Client: ${cn}
Nationality: ${nat}
Date of Birth: ${dob}
${fieldContext}Documents uploaded:
${docList || "None uploaded yet."}
Case notes: ${notes}
${(fieldValues.course_name || fieldValues.education_provider || fieldValues.coe_number) ? `
Enrolled course details:
- Course: ${fieldValues.course_name ?? "[Not recorded]"}
- Provider: ${fieldValues.education_provider ?? "[Not recorded]"}
- CoE Number: ${fieldValues.coe_number ?? "[Not recorded]"}
- Course dates: ${fieldValues.course_start_date ?? "[Not recorded]"} to ${fieldValues.course_end_date ?? "[Not recorded]"}
- English test: ${fieldValues.english_test_type ?? "[Not recorded]"}, Overall: ${fieldValues.english_overall_score ?? "[Not recorded]"}
- Funds available: ${fieldValues.funds_available ? "AUD " + String(fieldValues.funds_available) : "[Not recorded]"}
- Funds source: ${fieldValues.funds_source ?? "[Not recorded]"}` : ""}

CRITICAL: Each answer must be STRICTLY under 150 words. Written in first person. Specific and evidence-based.

Format your response exactly as:

Q1. CURRENT CIRCUMSTANCES
[Answer under 150 words addressing: family ties, employment, community ties, economic circumstances, reasons these ties will bring them home]

Q2. COURSE AND DESTINATION CHOICE
[Answer under 150 words addressing: why this specific course, why Australia specifically, research undertaken into course and institution, why not study in home country]

Q3. BENEFITS OF STUDYING THIS COURSE
[Answer under 150 words addressing: how course aligns with current qualifications, career benefit in home country, expected salary improvement, relevance to future employment]

Q4. STUDY HISTORY IN AUSTRALIA
[Answer under 150 words — if no prior study state: 'I have not previously studied in Australia.' If there is prior history, explain it]

Q5. OTHER RELEVANT INFORMATION
[Answer under 150 words — any additional compelling information: financial capacity, immigration compliance history, support from family/employer, commitment to visa conditions]

Use [PLACEHOLDER] brackets where specific information is not available.`;

    case "GS_SUPPORTING_STATEMENT":
      return `Generate a comprehensive Genuine Student (GS) supporting statement (600-800 words) for an SC-500 student visa application to be uploaded as a supporting document to ImmiAccount.

Client: ${cn}
Nationality: ${nat}
Date of Birth: ${dob}
${fieldContext}Documents uploaded:
${docList || "None uploaded yet."}
Case notes: ${notes}
${(fieldValues.course_name || fieldValues.education_provider || fieldValues.coe_number) ? `
Enrolled course details:
- Course: ${fieldValues.course_name ?? "[Not recorded]"}
- Provider: ${fieldValues.education_provider ?? "[Not recorded]"}
- CoE Number: ${fieldValues.coe_number ?? "[Not recorded]"}
- Course dates: ${fieldValues.course_start_date ?? "[Not recorded]"} to ${fieldValues.course_end_date ?? "[Not recorded]"}
- English test: ${fieldValues.english_test_type ?? "[Not recorded]"}, Overall: ${fieldValues.english_overall_score ?? "[Not recorded]"}
- Funds available: ${fieldValues.funds_available ? "AUD " + String(fieldValues.funds_available) : "[Not recorded]"}
- Funds source: ${fieldValues.funds_source ?? "[Not recorded]"}` : ""}

This is a supplementary narrative document that expands on the form responses with more detailed evidence and context. Unlike the 150-word form responses, this document can be comprehensive.

Structure the document as follows:

# Genuine Student Statement — ${cn}

## 1. Introduction and Current Circumstances
Detailed account of current life situation, family ties, employment, community involvement, and economic circumstances in home country.

## 2. Reasons for Choosing Australia and This Course
Detailed explanation of research undertaken, why this specific institution and course, career alignment, and why Australia over other destinations.

## 3. Financial Capacity
Overview of financial arrangements for the study period including tuition, living costs (note the AUD $29,710 annual living cost requirement), and source of funds.

## 4. Ties to Home Country and Intention to Return
Specific ties — family, property, employment prospects — that demonstrate genuine intention to return home after completing studies.

## 5. Compliance with Visa Conditions
Commitment to complying with student visa conditions including condition 8202 (course attendance and progress), work limitations (48 hours per fortnight), and OSHC requirements.

## 6. Conclusion
Brief concluding statement reinforcing genuine student status.

Use [PLACEHOLDER] where specific information is unavailable. Write in first person.`;

    case "POSITION_DESCRIPTION":
      return `Generate a formal Position Description letter for an SC-482 TSS nomination.

Employer: ${sponsorName}
ABN: ${sponsorAbn}
Contact: ${sponsorContact}
Stream: ${stream}
Worker: ${cn}
${positionContext}
${fieldContext}${(fieldValues.nominated_position || fieldValues.anzsco_code) ? `
Position details from case overview:
- Nominated Position: ${fieldValues.nominated_position ?? "[Not recorded]"}
- ANZSCO Code: ${fieldValues.anzsco_code ?? "[Not recorded]"}
- Annual Salary: ${fieldValues.salary_amount ? "AUD " + String(fieldValues.salary_amount) : "[Not recorded]"}
- Work Location: ${fieldValues.work_location ?? "[Not recorded]"}
- LMT Required: ${fieldValues.lmt_required ? "Yes" : "No"}
- LMT Exempt Reason: ${fieldValues.lmt_exempt_reason ?? "N/A"}
- LMT Outcome: ${fieldValues.lmt_outcome_summary ?? "[Not recorded]"}
- Worker Qualifications: ${fieldValues.worker_qualification ?? "[Not recorded]"}
- Worker Experience: ${fieldValues.worker_experience ?? "[Not recorded]"}` : ""}

# Position Description — ${positionTitle ?? "[POSITION TITLE]"} (${anzscoCode ?? "[ANZSCO CODE]"})

## Employer Details
Company name, ABN, address placeholder, industry

## Position Overview
Title, ANZSCO code, employment type (full-time), salary ([SALARY TBC — must meet TSMIT of $73,150]), reporting to [SUPERVISOR TITLE]

## Key Duties and Responsibilities
List at least 10 specific duties relevant to the position

## Required Qualifications
Minimum qualifications, preferred qualifications, years of experience

## Required Skills and Competencies
Technical skills, soft skills, any licensing requirements

## Employment Conditions
Hours per week, location, commencement date placeholder

## Declaration
Standard employer declaration that the position is genuine and the duties are as described.

Format as a formal business document.`;

    case "LMT_SUMMARY":
      return `Generate a Labour Market Testing compliance summary document for an SC-482 nomination.

Employer: ${sponsorName}
Stream: ${stream}
${positionContext}
${fieldContext}${(fieldValues.nominated_position || fieldValues.anzsco_code) ? `
Position details from case overview:
- Nominated Position: ${fieldValues.nominated_position ?? "[Not recorded]"}
- ANZSCO Code: ${fieldValues.anzsco_code ?? "[Not recorded]"}
- Annual Salary: ${fieldValues.salary_amount ? "AUD " + String(fieldValues.salary_amount) : "[Not recorded]"}
- Work Location: ${fieldValues.work_location ?? "[Not recorded]"}
- LMT Required: ${fieldValues.lmt_required ? "Yes" : "No"}
- LMT Exempt Reason: ${fieldValues.lmt_exempt_reason ?? "N/A"}
- LMT Outcome: ${fieldValues.lmt_outcome_summary ?? "[Not recorded]"}
- Worker Qualifications: ${fieldValues.worker_qualification ?? "[Not recorded]"}
- Worker Experience: ${fieldValues.worker_experience ?? "[Not recorded]"}` : ""}

# Labour Market Testing Summary — ${sponsorName}

## 1. Executive Summary
Brief overview of LMT undertaken and outcome

## 2. Position Details
Title, ANZSCO, salary range, key requirements

## 3. Advertising Campaign
- Platform 1: Seek.com.au — dates: [START DATE] to [END DATE]
- Platform 2: LinkedIn — dates: [START DATE] to [END DATE]
- Platform 3: [COMPANY WEBSITE if applicable]
Note: Advertising period must be minimum 4 weeks and within 4 months of nomination lodgement

## 4. Applications Received
Total applications, breakdown by citizenship status

## 5. Assessment of Australian Applicants
How each Australian/PR applicant was assessed and reasons for non-selection

## 6. Conclusion and Declaration
Statement that no suitably qualified Australian citizen or PR holder was available, employer declaration of accuracy

## 7. Compliance Statement
Reference to Migration Regulations 2.72C`;

    case "NOMINATION_COVER_LETTER":
      return `Generate a nomination cover letter for an SC-482 Temporary Skill Shortage visa nomination.

Employer: ${sponsorName}
ABN: ${sponsorAbn}
Worker: ${cn}
Stream: ${stream}
Case ref: ${ref}
${positionContext}
${fieldContext}${(fieldValues.nominated_position || fieldValues.anzsco_code) ? `
Position details from case overview:
- Nominated Position: ${fieldValues.nominated_position ?? "[Not recorded]"}
- ANZSCO Code: ${fieldValues.anzsco_code ?? "[Not recorded]"}
- Annual Salary: ${fieldValues.salary_amount ? "AUD " + String(fieldValues.salary_amount) : "[Not recorded]"}
- Work Location: ${fieldValues.work_location ?? "[Not recorded]"}
- LMT Required: ${fieldValues.lmt_required ? "Yes" : "No"}
- LMT Exempt Reason: ${fieldValues.lmt_exempt_reason ?? "N/A"}
- LMT Outcome: ${fieldValues.lmt_outcome_summary ?? "[Not recorded]"}
- Worker Qualifications: ${fieldValues.worker_qualification ?? "[Not recorded]"}
- Worker Experience: ${fieldValues.worker_experience ?? "[Not recorded]"}` : ""}

Structure as a formal business letter:
1. Subject line identifying the nomination
2. Introduction — employer details and purpose of letter
3. Overview of the business and genuine need for the position
4. Details of the nominated occupation and why the worker is suitable
5. Summary of LMT undertaken (reference attached LMT Summary document)
6. Declaration of compliance with all sponsorship obligations under the Migration Act 1958
7. Professional sign-off from authorised company representative

Format as a formal business letter with letterhead placeholders. Include all standard sponsor declarations required by DHA.`;

    case "RELATIONSHIP_STATEMENT":
      return `Generate a relationship statement template for a partner visa application.

Applicant: ${cn}
Nationality: ${nat}
Visa: SC-${sub}

# Relationship Statement — ${cn}

Generate a comprehensive template covering the 4 categories DHA assesses for partner visas:

## 1. Financial Aspects of the Relationship
Joint finances, shared expenses, property, financial interdependence

## 2. Nature of the Household
Living arrangements, shared responsibilities, cohabitation evidence

## 3. Social Aspects of the Relationship
How relationship is acknowledged by family and friends, social activities together, knowledge of each other's lives

## 4. Commitment to the Relationship
Length and history of relationship, future plans, reasons for choosing Australia

Use [PLACEHOLDER] throughout for specific details the agent needs to fill in. Include guidance notes in brackets on what evidence to attach for each section.`;

    case "COVER_LETTER_DHA":
      return `Generate a cover letter to the Department of Home Affairs for a partner visa application.

Applicant: ${cn}
Nationality: ${nat}
Visa: SC-${sub}
Agent: ${agentName}
MARN: ${marn}
Firm: ${firmName}

Structure as a formal migration agent cover letter:
1. Agent details and MARN at top
2. Department header — To: Department of Home Affairs
3. Re: Application for Subclass ${sub} Partner Visa — ${cn}
4. Introduction identifying the applicant and application type
5. Summary of the relationship and key supporting evidence being provided
6. List of documents included with the application
7. Any specific circumstances or matters to draw to DHA's attention
8. Declaration that the registered migration agent prepared the application
9. Professional sign-off with MARN

Include the standard registered migration agent statement as required by the Migration Act 1958.`;

    case "CLIENT_WELCOME_LETTER":
      return `Generate a professional client welcome letter.

Client: ${cn}
Nationality: ${nat}
Visa: SC-${sub}
Agent: ${agentName}
Firm: ${firmName}
Documents received:
${docList || "None yet — document checklist to be sent separately."}

Dear ${cn},

Structure:
1. Warm welcome and confirmation of engagement
2. Brief overview of the SC-${sub} process and realistic timeline
3. What we have received so far and what is still needed
4. Explanation of the secure client portal for document uploads
5. Our commitment to keeping them informed at each stage
6. Contact details placeholder and availability
7. Professional sign-off

Tone: Professional but warm and reassuring. Australian English.`;

    case "DOCUMENT_REQUEST_LETTER":
      return `Generate a professional document request letter to the client.

Client: ${cn}
Visa: SC-${sub}
Agent: ${agentName}
Firm: ${firmName}
Outstanding documents:
${docList || "To be determined — use [DOCUMENT NAME] placeholders."}

Structure:
1. Subject line referencing their visa application (Ref: ${ref})
2. Opening paragraph explaining the purpose of the letter
3. Clear numbered list of outstanding documents required
4. Specific requirements or notes for each document type (certification, translations etc.)
5. Deadline request (use [DATE] placeholder)
6. How to submit — via the secure client portal
7. Professional sign-off with contact details

Tone: Professional but friendly. Clear and specific about exactly what is needed.`;

    case "VISA_GRANT_NOTIFICATION":
      return `Generate a visa grant notification letter.

Client: ${cn}
Visa: SC-${sub}
Grant date: ${grantDate}
Visa expiry: ${visaExpiry}
Agent: ${agentName}
Firm: ${firmName}

Structure:
1. Congratulations opening
2. Visa details — subclass SC-${sub}, grant date ${grantDate}, expiry ${visaExpiry}
3. Key visa conditions for SC-${sub} (use standard conditions for this visa class)
4. Immediate next steps for the client
5. Invitation to contact firm for future migration needs
6. Professional sign-off`;

    case "VISA_REFUSAL_LETTER":
      return `Generate a professional visa refusal notification letter.

Client: ${cn}
Visa: SC-${sub}
Agent: ${agentName}
Firm: ${firmName}
Case notes: ${notes}

Structure:
1. Professional notification of the refusal outcome
2. Explanation that the agent is reviewing the delegate's decision in detail
3. Review options available — AAT merits review timeframes (21 days for onshore, 70 days for offshore), new application pathway
4. What the client must do now (maintain lawful status, bridging visa status if applicable)
5. Request for urgent meeting/call to discuss options
6. Empathetic, professional tone — this is difficult news

Note: Use warm, empathetic language while remaining professional. Do not speculate on reasons for refusal.`;

    default:
      return `Generate a professional migration document for:
Client: ${cn}
Visa: SC-${sub}
Agent: ${agentName}
Firm: ${firmName}
Document type: ${documentType}
Case notes: ${notes}`;
  }
}

// ── Document titles ───────────────────────────────────────────────────────────

const DOC_TITLES: Record<string, string> = {
  GS_FORM_RESPONSES:      "Genuine Student Form Responses",
  GS_SUPPORTING_STATEMENT:"Genuine Student Supporting Statement",
  POSITION_DESCRIPTION:   "Position Description",
  LMT_SUMMARY:            "Labour Market Testing Summary",
  NOMINATION_COVER_LETTER:"Nomination Cover Letter",
  RELATIONSHIP_STATEMENT: "Relationship Statement",
  COVER_LETTER_DHA:       "Cover Letter to Department of Home Affairs",
  CLIENT_WELCOME_LETTER:  "Client Welcome Letter",
  DOCUMENT_REQUEST_LETTER:"Document Request Letter",
  VISA_GRANT_NOTIFICATION:"Visa Grant Notification",
  VISA_REFUSAL_LETTER:    "Visa Refusal Letter",
};

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentType } = await request.json();
  if (!documentType) {
    return NextResponse.json({ error: "documentType is required" }, { status: 400 });
  }

  // ── Fetch profile + firm for usage enforcement ──────────────────────────────
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: firmRow } = await supabaseAdmin
    .from("firms")
    .select("plan")
    .eq("id", profile.firm_id)
    .single();

  const plan = (firmRow as { plan?: string } | null)?.plan ?? "starter";
  const limit = aiGenerationLimit(plan);

  // Count this calendar month's usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("firm_id", profile.firm_id)
    .gte("created_at", startOfMonth.toISOString());

  const used = count ?? 0;

  if (used >= limit) {
    return NextResponse.json(
      {
        error: `Monthly AI generation limit reached (${limit}/month on the ${plan} plan). Please upgrade to generate more documents.`,
        used,
        limit,
      },
      { status: 429 }
    );
  }

  // ── Fetch case context ──────────────────────────────────────────────────────
  const ctx = await fetchContext(params.id);
  if (!ctx) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // Read relevant documents for multi-modal generation
  const relevantLabels = DOCUMENT_LABELS[documentType] ?? [];
  const attachedDocs = await readCaseDocuments(params.id, relevantLabels);

  const userPrompt = buildUserPrompt(documentType, ctx);

  // ── Call Anthropic API with streaming ───────────────────────────────────────
  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: attachedDocs.length > 0
        ? [{
            role: "user" as const,
            content: [
              {
                type: "text" as const,
                text: userPrompt + "\n\nI have attached the uploaded documents for this case. Please read them carefully and use the specific details you find — course names, dates, fund amounts, test scores, employment details — to write a genuinely personalised document. Do not invent details not found in the documents or case data. If information is missing, use [PLACEHOLDER] and note what is needed.",
              },
              ...attachedDocs.map((doc) => ({
                type: "document" as const,
                source: {
                  type: "base64" as const,
                  media_type: doc.mediaType,
                  data: doc.base64,
                },
                title: doc.label,
                context: `This is the ${doc.label} uploaded for this visa application. Extract relevant information to personalise the document being generated.`,
              })),
            ],
          }]
        : [{ role: "user" as const, content: userPrompt }],
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    console.error(
      "[ai/generate] Anthropic API error —",
      "status:", anthropicRes.status,
      "statusText:", anthropicRes.statusText,
      "body:", errText
    );
    return NextResponse.json(
      { error: "AI generation failed. Check API key and model availability." },
      { status: 502 }
    );
  }

  // ── Parse Anthropic SSE → emit raw text chunks to the client ───────────────
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Capture token counts from SSE events for usage tracking
  let tokensInput = 0;
  let tokensOutput = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data) as {
                type: string;
                message?: { usage?: { input_tokens?: number } };
                usage?: { output_tokens?: number };
                delta?: { type: string; text?: string };
              };

              // Capture input token count from message_start
              if (parsed.type === "message_start" && parsed.message?.usage?.input_tokens) {
                tokensInput = parsed.message.usage.input_tokens;
              }

              // Capture output token count from message_delta
              if (parsed.type === "message_delta" && parsed.usage?.output_tokens) {
                tokensOutput = parsed.usage.output_tokens;
              }

              // Forward text to client
              if (
                parsed.type === "content_block_delta" &&
                parsed.delta?.type === "text_delta" &&
                parsed.delta.text
              ) {
                controller.enqueue(encoder.encode(parsed.delta.text));
              }
            } catch {
              // Ignore malformed SSE lines
            }
          }
        }
      } finally {
        controller.close();

        // Insert usage record after stream completes (fire-and-forget is fine)
        supabaseAdmin
          .from("ai_usage")
          .insert({
            firm_id: profile.firm_id,
            profile_id: profile.id,
            case_id: params.id,
            document_type: documentType,
            tokens_input: tokensInput || null,
            tokens_output: tokensOutput || null,
          })
          .then(({ error }) => {
            if (error) console.error("[ai/generate] failed to insert ai_usage:", error.message);
          });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Document-Title": encodeURIComponent(DOC_TITLES[documentType] ?? documentType),
      "X-Remaining-Generations": String(Math.max(0, limit - used - 1)),
      "Cache-Control": "no-cache",
    },
  });
}
