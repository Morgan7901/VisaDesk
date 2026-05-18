import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS enforces firm ownership — fetch storage_path
  const { data: docRow } = await supabase
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
