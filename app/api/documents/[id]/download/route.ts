import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/documents/[id]/download
// [id] can be either:
//   - a case_document_id → returns signed URLs for all files in that requirement
//   - a document_files id → returns a signed URL for that single file
//
// Query param: ?file=true forces single-file mode (looks up document_files.id)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionClient = await createClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const singleFile = searchParams.get("file") === "true";

  if (singleFile) {
    // Single file mode — id is a document_files.id
    const { data: fileRow } = await supabaseAdmin
      .from("document_files")
      .select("storage_path, file_name")
      .eq("id", id)
      .single();

    if (!fileRow) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const { data: signed, error } = await supabaseAdmin.storage
      .from("case-documents")
      .createSignedUrl(fileRow.storage_path, 60);

    if (error || !signed?.signedUrl) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to generate download link." },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: signed.signedUrl, fileName: fileRow.file_name });
  }

  // Multi-file mode — id is a case_document_id
  // Try case_document first, fall back to treating as document_files id
  const { data: files } = await supabaseAdmin
    .from("document_files")
    .select("id, storage_path, file_name")
    .eq("case_document_id", id)
    .order("uploaded_at", { ascending: false });

  if (files && files.length > 0) {
    // Generate signed URLs for all files
    const signedUrls = await Promise.all(
      files.map(async (f) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("case-documents")
          .createSignedUrl(f.storage_path, 60);
        return {
          fileId: f.id,
          fileName: f.file_name,
          signedUrl: signed?.signedUrl ?? null,
        };
      })
    );
    return NextResponse.json({ files: signedUrls });
  }

  // Fallback: treat id as a single document_files.id
  const { data: fileRow } = await supabaseAdmin
    .from("document_files")
    .select("storage_path, file_name")
    .eq("id", id)
    .single();

  if (!fileRow) {
    // Last resort: try old case_documents storage_path (backwards compat)
    const { data: docRow } = await supabaseAdmin
      .from("case_documents")
      .select("storage_path, file_name")
      .eq("id", id)
      .single();

    if (!docRow?.storage_path) {
      return NextResponse.json({ error: "No file uploaded yet." }, { status: 400 });
    }

    const { data: signed, error } = await supabaseAdmin.storage
      .from("case-documents")
      .createSignedUrl(docRow.storage_path, 60);

    if (error || !signed?.signedUrl) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to generate download link." },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: signed.signedUrl });
  }

  const { data: signed, error } = await supabaseAdmin.storage
    .from("case-documents")
    .createSignedUrl(fileRow.storage_path, 60);

  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to generate download link." },
      { status: 500 }
    );
  }

  return NextResponse.json({ signedUrl: signed.signedUrl, fileName: fileRow.file_name });
}
