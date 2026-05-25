import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/cases/[id]/activity
// Returns up to 50 activity items merged from:
//   - communications (all types)
//   - case_stage_progress (is_complete = true)
//   - document_files (uploads)
//   - ai_documents (AI drafts created)
//   - deadlines (created)
// Sorted newest-first.

export interface ActivityItem {
  id: string;
  type: "note" | "email" | "communication" | "stage_completed" | "document_uploaded" | "ai_document" | "deadline";
  title: string;
  body?: string | null;
  author?: string | null;
  created_at: string;
  meta?: Record<string, unknown>;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;

  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  // Verify case belongs to firm
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const items: ActivityItem[] = [];

  // ── Communications (notes, emails, etc.) ──
  const { data: comms } = await supabaseAdmin
    .from("communications")
    .select("id, comm_type, direction, subject, body, created_at, author_id")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch author names for comms
  const authorIdsRaw = (comms ?? []).map((c: { author_id: string | null }) => c.author_id).filter(Boolean) as string[];
  const authorIds = Array.from(new Set(authorIdsRaw));
  const authorMap: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: authors } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);
    (authors ?? []).forEach((a: { id: string; full_name: string }) => {
      authorMap[a.id] = a.full_name;
    });
  }

  for (const c of comms ?? []) {
    const commType = c.comm_type as string;
    let type: ActivityItem["type"] = "communication";
    if (commType === "note") type = "note";
    else if (commType === "email") type = "email";

    items.push({
      id: c.id,
      type,
      title: c.subject ?? (commType === "note" ? "Note added" : "Communication"),
      body: c.body,
      author: c.author_id ? (authorMap[c.author_id as string] ?? null) : null,
      created_at: c.created_at,
      meta: { comm_type: c.comm_type, direction: c.direction },
    });
  }

  // ── Completed workflow stages ──
  const { data: stages } = await supabaseAdmin
    .from("case_stage_progress")
    .select("id, stage_id, completed_at, completed_by, notes")
    .eq("case_id", caseId)
    .eq("is_complete", true)
    .order("completed_at", { ascending: false })
    .limit(20);

  // Fetch stage labels
  const stageIds = Array.from(new Set((stages ?? []).map((s: { stage_id: string }) => s.stage_id)));
  const stageMap: Record<string, string> = {};
  if (stageIds.length > 0) {
    const { data: stageRows } = await supabaseAdmin
      .from("workflow_stages")
      .select("id, label")
      .in("id", stageIds);
    (stageRows ?? []).forEach((s: { id: string; label: string }) => {
      stageMap[s.id] = s.label;
    });
  }

  for (const s of stages ?? []) {
    const completedAt = (s.completed_at as string | null) ?? (s as { created_at?: string }).created_at ?? new Date().toISOString();
    items.push({
      id: `stage-${s.id}`,
      type: "stage_completed",
      title: `Stage completed: ${stageMap[s.stage_id as string] ?? "Unknown stage"}`,
      body: s.notes ?? null,
      author: s.completed_by ? (authorMap[s.completed_by as string] ?? null) : null,
      created_at: completedAt,
      meta: { stage_id: s.stage_id },
    });
  }

  // ── Document uploads ──
  const { data: docFiles } = await supabaseAdmin
    .from("document_files")
    .select("id, file_name, uploaded_at, uploaded_by, case_document_id")
    .eq("case_id", caseId)
    .order("uploaded_at", { ascending: false })
    .limit(30);

  for (const df of docFiles ?? []) {
    items.push({
      id: `docfile-${df.id}`,
      type: "document_uploaded",
      title: `Document uploaded: ${df.file_name ?? "File"}`,
      author: df.uploaded_by ? (authorMap[df.uploaded_by as string] ?? null) : null,
      created_at: df.uploaded_at as string,
      meta: { case_document_id: df.case_document_id, file_name: df.file_name },
    });
  }

  // ── AI documents ──
  const { data: aiDocs } = await supabaseAdmin
    .from("ai_documents")
    .select("id, title, document_type, created_at, created_by")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const ai of aiDocs ?? []) {
    items.push({
      id: `ai-${ai.id}`,
      type: "ai_document",
      title: `AI draft created: ${ai.title}`,
      author: ai.created_by ? (authorMap[ai.created_by as string] ?? null) : null,
      created_at: ai.created_at as string,
      meta: { document_type: ai.document_type, ai_doc_id: ai.id },
    });
  }

  // ── Deadlines ──
  const { data: deadlines } = await supabaseAdmin
    .from("deadlines")
    .select("id, title, due_date, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const d of deadlines ?? []) {
    items.push({
      id: `deadline-${d.id}`,
      type: "deadline",
      title: `Deadline set: ${d.title}`,
      created_at: d.created_at as string,
      meta: { due_date: d.due_date },
    });
  }

  // Sort all by created_at descending, take top 50
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ items: items.slice(0, 50) });
}
