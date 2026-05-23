import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/documents/[id]/files
// Returns all document_files for a given case_document_id, including reviewer info.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseDocumentId } = await params;
  const sessionClient = await createClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: files, error } = await supabaseAdmin
    .from("document_files")
    .select(`
      id,
      file_name,
      file_size,
      mime_type,
      storage_path,
      issue_date,
      expiry_date,
      notes,
      review_status,
      review_notes,
      reviewed_at,
      uploaded_at,
      uploaded_by_portal,
      uploaded_by,
      reviewed_by,
      uploader:profiles!uploaded_by(full_name),
      reviewer:profiles!reviewed_by(full_name)
    `)
    .eq("case_document_id", caseDocumentId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ files: files ?? [] });
}
