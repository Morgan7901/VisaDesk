import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";


export async function POST(request: Request) {
  const sessionClient = await createClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch firm_id via admin client to bypass RLS
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  const { case_id, label, description, portal_upload, is_required } =
    await request.json();

  if (!case_id || !label?.trim()) {
    return NextResponse.json(
      { error: "case_id and label are required." },
      { status: 400 }
    );
  }

  // Verify the case belongs to the user's firm using admin client with explicit firm_id check
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id")
    .eq("id", case_id)
    .eq("firm_id", profile.firm_id)
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
  const { data: doc, error: docErr } = await supabaseAdmin
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
