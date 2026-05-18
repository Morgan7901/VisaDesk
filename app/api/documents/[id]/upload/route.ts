import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get firm_id from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "Profile not found." }, { status: 400 });
  }

  // Get case_documents row to resolve case_id — RLS enforces firm ownership
  const { data: docRow } = await supabase
    .from("case_documents")
    .select("id, case_id")
    .eq("id", params.id)
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
  const storagePath = `${profile.firm_id}/${docRow.case_id}/${params.id}/${safeFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: storageErr } = await supabaseAdmin.storage
    .from("case-documents")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (storageErr) {
    return NextResponse.json({ error: storageErr.message }, { status: 500 });
  }

  // Update case_documents record
  const { error: updateErr } = await supabase
    .from("case_documents")
    .update({
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
      status: "uploaded",
      // Clear any prior rejection
      review_notes: null,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq("id", params.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
