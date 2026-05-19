import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";


export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionClient = await createClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use admin client to fetch storage_path (case_documents has no firm_id, scoped by case ownership)
  const { data: docRow } = await supabaseAdmin
    .from("case_documents")
    .select("storage_path, file_name")
    .eq("id", params.id)
    .single();

  if (!docRow) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (!docRow.storage_path) {
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
