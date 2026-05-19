import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;

  // 1. Auth
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  // 2. Verify case belongs to firm & get visa_subclass
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id, visa_subclass")
    .eq("id", caseId)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  // 3. Parse body — agent sends the checked document_type IDs
  const { selectedIds } = await request.json() as { selectedIds: string[] };
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    return NextResponse.json({ error: "No documents selected." }, { status: 400 });
  }

  // 4. Fetch the selected document_types to get their labels
  const { data: docTypes } = await supabaseAdmin
    .from("document_types")
    .select("id, label, is_required, portal_upload, description")
    .in("id", selectedIds);

  if (!docTypes?.length) {
    return NextResponse.json({ error: "No matching document types found." }, { status: 400 });
  }

  // 5. Get existing labels for this case to avoid duplicates
  const { data: existing } = await supabaseAdmin
    .from("case_documents")
    .select("label")
    .eq("case_id", caseId);

  const existingLabels = new Set((existing ?? []).map((d) => d.label.toLowerCase()));

  // 6. Filter out duplicates
  const toInsert = docTypes
    .filter((dt) => !existingLabels.has(dt.label.toLowerCase()))
    .map((dt) => ({
      case_id: caseId,
      document_type_id: dt.id,
      label: dt.label,
      status: "pending",
      portal_upload: dt.portal_upload ?? null, // denormalised so portal can filter directly
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({ created: [], skipped: docTypes.length });
  }

  // 7. Bulk insert
  const { data: created, error } = await supabaseAdmin
    .from("case_documents")
    .insert(toInsert)
    .select(
      "id, label, status, file_name, file_size, uploaded_at, review_notes, storage_path, document_types!document_type_id(description, is_required, portal_upload)"
    );

  if (error) {
    console.error("[load-template]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    created: created ?? [],
    skipped: docTypes.length - toInsert.length,
  });
}
