import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { case_id, label, description, portal_upload, is_required } =
    await request.json();

  if (!case_id || !label?.trim()) {
    return NextResponse.json(
      { error: "case_id and label are required." },
      { status: 400 }
    );
  }

  // Verify the case belongs to the user's firm via RLS
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id")
    .eq("id", case_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  // Create a custom document_type row (visa_subclass null = custom)
  const { data: docType, error: typeErr } = await supabaseAdmin
    .from("document_types")
    .insert({
      visa_subclass: null,
      label: label.trim(),
      description: description?.trim() || null,
      is_required: is_required ?? true,
      portal_upload: portal_upload || null,
    })
    .select("id")
    .single();

  if (typeErr || !docType) {
    return NextResponse.json(
      { error: typeErr?.message ?? "Failed to create document type." },
      { status: 500 }
    );
  }

  // Create the case_documents row
  const { data: doc, error: docErr } = await supabase
    .from("case_documents")
    .insert({
      case_id,
      document_type_id: docType.id,
      label: label.trim(),
      status: "pending",
    })
    .select("id")
    .single();

  if (docErr || !doc) {
    return NextResponse.json(
      { error: docErr?.message ?? "Failed to create document." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: doc.id });
}
