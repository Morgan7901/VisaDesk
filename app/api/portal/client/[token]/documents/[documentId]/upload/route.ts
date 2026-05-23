import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
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

  // 1. Validate token → find client
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, firm_id, portal_active")
    .eq("portal_token", token)
    .eq("portal_active", true)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Invalid or expired portal link." }, { status: 401 });
  }

  // 2. Verify the document belongs to one of this client's cases
  const { data: doc } = await supabaseAdmin
    .from("case_documents")
    .select("id, case_id, multiple_files_allowed, cases!case_id(firm_id, client_id)")
    .eq("id", documentId)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const caseRow: any = Array.isArray(doc.cases) ? doc.cases[0] : doc.cases;
  if (caseRow?.firm_id !== client.firm_id || caseRow?.client_id !== client.id) {
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
  const storagePath = `${client.firm_id}/${doc.case_id}/${documentId}/${timestamp}_${safeName}`;

  // 4. Upload to Supabase Storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from("case-documents")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("[portal/client/upload] storage error:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 5. INSERT into document_files (not updating case_documents directly)
  const { data: newFile, error: fileErr } = await supabaseAdmin
    .from("document_files")
    .insert({
      case_document_id: documentId,
      case_id: doc.case_id,
      firm_id: client.firm_id,
      uploaded_by_portal: "client",
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
    console.error("[portal/client/upload] db error:", fileErr);
    return NextResponse.json({ error: fileErr?.message ?? "Failed to save file record." }, { status: 500 });
  }

  // 6. Recalculate overall_status on the parent case_documents row
  const overallStatus = await recalcOverallStatus(documentId);

  // 7. Notify firm agents
  const [{ data: clientRow }, { data: docRow }, { data: firmProfiles }] = await Promise.all([
    supabaseAdmin.from("clients").select("full_name").eq("id", client.id).single(),
    supabaseAdmin.from("case_documents").select("label").eq("id", documentId).single(),
    supabaseAdmin.from("profiles").select("id").eq("firm_id", client.firm_id).eq("suspended", false),
  ]);
  const profileIds = (firmProfiles ?? []).map((p) => p.id);
  await notify(
    profileIds,
    client.firm_id,
    "document_uploaded",
    `${clientRow?.full_name ?? "Client"} uploaded ${docRow?.label ?? "a document"}`,
    undefined,
    `/dashboard/cases/${doc.case_id}/documents`
  );

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
