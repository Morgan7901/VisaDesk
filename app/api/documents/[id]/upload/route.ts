import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// Helper: recalculate overall_status on a case_documents row based on its document_files
async function recalcOverallStatus(caseDocumentId: string) {
  const { data: files } = await supabaseAdmin
    .from("document_files")
    .select("review_status")
    .eq("case_document_id", caseDocumentId);

  let newStatus = "missing";
  if (files && files.length > 0) {
    if (files.some((f) => f.review_status === "approved")) {
      newStatus = "approved";
    } else if (files.some((f) => f.review_status === "rejected")) {
      newStatus = "rejected";
    } else if (files.some((f) => f.review_status === "pending")) {
      newStatus = "uploaded";
    }
  }

  await supabaseAdmin
    .from("case_documents")
    .update({ overall_status: newStatus, status: newStatus === "uploaded" ? "uploaded" : newStatus })
    .eq("id", caseDocumentId);

  return newStatus;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "Profile not found." }, { status: 400 });
  }

  // Get case_documents row to resolve case_id
  const { data: docRow } = await supabase
    .from("case_documents")
    .select("id, case_id")
    .eq("id", id)
    .single();

  if (!docRow) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const storagePath = `${profile.firm_id}/${docRow.case_id}/${id}/${timestamp}_${safeFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: storageErr } = await supabaseAdmin.storage
    .from("case-documents")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (storageErr) {
    return NextResponse.json({ error: storageErr.message }, { status: 500 });
  }

  // Insert into document_files
  const { data: newFile, error: fileErr } = await supabaseAdmin
    .from("document_files")
    .insert({
      case_document_id: id,
      case_id: docRow.case_id,
      firm_id: profile.firm_id,
      uploaded_by: user.id,
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
    return NextResponse.json({ error: fileErr?.message ?? "Could not save file record." }, { status: 500 });
  }

  // Recalculate overall_status on the parent case_documents row
  const newStatus = await recalcOverallStatus(id);

  return NextResponse.json({ success: true, file: newFile, overallStatus: newStatus });
}
