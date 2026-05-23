import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// POST /api/cases/[id]/documents/mark-requested
// Marks selected case_documents as 'requested', recording who requested and when.
//
// Body:
//   docIds         string[]   — case_documents.id values to mark as requested
//   requestMessage? string    — the message text that was sent

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
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  // Verify case belongs to the firm
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const body = await request.json() as { docIds: string[]; requestMessage?: string };
  const { docIds, requestMessage } = body;

  if (!Array.isArray(docIds) || docIds.length === 0) {
    return NextResponse.json({ error: "docIds is required and must be a non-empty array." }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("case_documents")
    .update({
      overall_status: "requested",
      status: "pending",
      requested_at: now,
      requested_by: user.id,
      request_message: requestMessage?.trim() || null,
    })
    .in("id", docIds)
    .eq("case_id", caseId);

  if (error) {
    console.error("[mark-requested] update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: docIds.length });
}
