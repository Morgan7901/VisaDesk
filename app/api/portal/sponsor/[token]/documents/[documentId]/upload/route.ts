import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

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
      status: newStatus === "missing" ? "pending" : newStatus === "uploaded" ? "uploaded" : newStatus,
    })
    .eq("id", caseDocumentId);

  return newStatus;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string; documentId: string }> }
) {
  const { token, documentId } = await params;

  // 1. Validate token → find sponsor
  const { data: sponsor } = await supabaseAdmin
    .from("sponsors")
    .select("id, firm_id, portal_active")
    .eq("portal_token", token)
    .eq("portal_active", true)
    .single();

  if (!sponsor) {
    return NextResponse.json({ error: "Invalid or expired portal link." }, { status: 401 });
  }

  // 2. Verify the document belongs to one of this sponsor's cases
  const { data: doc } = await supabaseAdmin
    .from("case_documents")
    .select("id, case_id, multiple_files_allowed, cases!case_id(firm_id, sponsor_id)")
    .eq("id", documentId)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const caseRow: any = Array.isArray(doc.cases) ? doc.cases[0] : doc.cases;
  if (caseRow?.firm_id !== sponsor.firm_id || caseRow?.sponsor_id !== sponsor.id) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  // 3. Parse multipart form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const storagePath = `${sponsor.firm_id}/${doc.case_id}/${documentId}/${timestamp}_${safeName}`;

  // 4. Upload to Supabase Storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from("case-documents")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("[portal/sponsor/upload] storage error:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 5. INSERT into document_files
  const { data: newFile, error: fileErr } = await supabaseAdmin
    .from("document_files")
    .insert({
      case_document_id: documentId,
      case_id: doc.case_id,
      firm_id: sponsor.firm_id,
      uploaded_by_portal: "sponsor",
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type || null,
      review_status: "pending",
      uploaded_at: new Date().toISOString(),
    })
    .select("id, file_name, file_size, review_status, uploaded_at")
    .single();

  if (fileErr || !newFile) {
    console.error("[portal/sponsor/upload] db error:", fileErr);
    return NextResponse.json({ error: fileErr?.message ?? "Failed to save file record." }, { status: 500 });
  }

  // 6. Recalculate overall_status
  const overallStatus = await recalcOverallStatus(documentId);

  return NextResponse.json({
    document: {
      id: documentId,
      status: overallStatus,
      file_name: file.name,
      uploaded_at: newFile.uploaded_at,
    },
    file: newFile,
  });
}
