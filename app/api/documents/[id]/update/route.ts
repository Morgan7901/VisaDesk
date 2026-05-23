import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/documents/[id]/update
// Updates status / metadata on a single case_documents row.
// Used for: waive, mark N/A, and other agent-side status overrides.
//
// Body (all optional):
//   overall_status?  "waived" | "missing" | "requested"
//   waived_reason?   string
//   not_applicable_reason? string

const ALLOWED_STATUSES = new Set(["waived", "missing", "requested"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const body = await request.json() as {
    overall_status?: string;
    waived_reason?: string;
    not_applicable_reason?: string;
  };

  const { overall_status, waived_reason, not_applicable_reason } = body;

  if (overall_status && !ALLOWED_STATUSES.has(overall_status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  // Verify the doc belongs to the agent's firm via case
  const { data: docRow } = await supabaseAdmin
    .from("case_documents")
    .select("id, case_id")
    .eq("id", id)
    .single();

  if (!docRow) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id")
    .eq("id", docRow.case_id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (overall_status) {
    updatePayload.overall_status = overall_status;
    updatePayload.status = overall_status === "waived" ? "pending" : overall_status;
  }
  if (waived_reason !== undefined) updatePayload.waived_reason = waived_reason || null;
  if (not_applicable_reason !== undefined) updatePayload.not_applicable_reason = not_applicable_reason || null;

  const { data: updated, error } = await supabaseAdmin
    .from("case_documents")
    .update(updatePayload)
    .eq("id", id)
    .select("id, overall_status, waived_reason, not_applicable_reason")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: updated });
}
