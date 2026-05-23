import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// Helper: recalculate overall_status on a case_documents row
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch file row to get storage_path and case_document_id
  const { data: fileRow } = await supabaseAdmin
    .from("document_files")
    .select("id, storage_path, case_document_id, firm_id")
    .eq("id", fileId)
    .single();

  if (!fileRow) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  // Verify the agent belongs to the same firm
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id || profile.firm_id !== fileRow.firm_id) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  // Delete from Supabase Storage
  const { error: storageErr } = await supabaseAdmin.storage
    .from("case-documents")
    .remove([fileRow.storage_path]);

  if (storageErr) {
    console.error("[files/delete] storage error:", storageErr);
    // Continue — still delete the DB record even if storage delete fails
  }

  // Delete from document_files
  const { error: dbErr } = await supabaseAdmin
    .from("document_files")
    .delete()
    .eq("id", fileId);

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  // Recalculate parent overall_status
  const overallStatus = await recalcOverallStatus(fileRow.case_document_id);

  return NextResponse.json({ success: true, overallStatus, caseDocumentId: fileRow.case_document_id });
}
