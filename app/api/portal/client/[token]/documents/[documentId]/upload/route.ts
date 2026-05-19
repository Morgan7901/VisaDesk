import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

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
    .select("id, case_id, cases!case_id(firm_id, client_id)")
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
  const storagePath = `case-documents/${client.firm_id}/${doc.case_id}/${documentId}/${safeName}`;

  // 4. Upload to Supabase Storage (upsert — allow re-upload)
  const { error: uploadError } = await supabaseAdmin.storage
    .from("case-documents")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    console.error("[portal/client/upload] storage error:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 5. Update case_documents record
  const { data: updated, error: dbError } = await supabaseAdmin
    .from("case_documents")
    .update({
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      uploaded_at: new Date().toISOString(),
      status: "uploaded",
    })
    .eq("id", documentId)
    .select("id, status, file_name, uploaded_at")
    .single();

  if (dbError) {
    console.error("[portal/client/upload] db error:", dbError);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ document: updated });
}
