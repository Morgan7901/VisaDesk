import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/documents/files/[fileId]/review
// Reviews a specific document_files row, then recalculates parent case_documents overall_status.

const VALID_STATUSES = new Set(["approved", "rejected"]);

async function recalcOverallStatus(caseDocumentId: string): Promise<string> {
  const { data: files } = await supabaseAdmin
    .from("document_files")
    .select("review_status")
    .eq("case_document_id", caseDocumentId);

  let newStatus = "missing";
  if (files && files.length > 0) {
    if (files.some((f) => f.review_status === "approved")) {
      newStatus = "approved";
    } else if (files.every((f) => f.review_status === "rejected")) {
      newStatus = "rejected";
    } else {
      newStatus = "uploaded";
    }
  }

  await supabaseAdmin
    .from("case_documents")
    .update({
      overall_status: newStatus,
      status: newStatus === "uploaded" ? "uploaded" : newStatus === "approved" ? "approved" : newStatus === "rejected" ? "rejected" : "pending",
    })
    .eq("id", caseDocumentId);

  return newStatus;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const sessionClient = await createClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { review_status, review_notes } = await request.json();

  if (!review_status || !VALID_STATUSES.has(review_status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (review_status === "rejected" && !review_notes?.trim()) {
    return NextResponse.json(
      { error: "Review notes are required when rejecting." },
      { status: 400 }
    );
  }

  const { data: fileRow } = await supabaseAdmin
    .from("document_files")
    .select("id, case_document_id")
    .eq("id", fileId)
    .single();

  if (!fileRow) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("document_files")
    .update({
      review_status,
      review_notes: review_notes?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", fileId)
    .select("id, review_status, review_notes, reviewed_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const overallStatus = await recalcOverallStatus(fileRow.case_document_id);

  return NextResponse.json({
    file: updated?.[0],
    overallStatus,
    caseDocumentId: fileRow.case_document_id,
  });
}
