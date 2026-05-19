import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";


const VALID_REVIEW_STATUSES = new Set(["approved", "rejected"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionClient = await createClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status, review_notes } = await request.json();

  if (!status || !VALID_REVIEW_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (status === "rejected" && !review_notes?.trim()) {
    return NextResponse.json(
      { error: "Review notes are required when rejecting a document." },
      { status: 400 }
    );
  }

  // Use admin client — case_documents has no firm_id, scoped by case ownership
  const { data: updated, error } = await supabaseAdmin
    .from("case_documents")
    .update({
      status,
      review_notes: review_notes?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select("id, status, review_notes");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json({ document: updated[0] });
}
