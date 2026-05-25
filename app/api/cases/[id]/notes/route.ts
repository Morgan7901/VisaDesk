import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// POST /api/cases/[id]/notes
// Inserts a new internal note into the communications table.
//
// Body:
//   body  string  required  — the note content

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;

  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  // Verify case belongs to firm
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const body = await request.json();
  const noteBody: string = body?.body?.trim() ?? "";

  if (!noteBody) {
    return NextResponse.json({ error: "Note body is required." }, { status: 400 });
  }

  const { data: note, error } = await supabaseAdmin
    .from("communications")
    .insert({
      case_id: caseId,
      firm_id: profile.firm_id,
      author_id: user.id,
      comm_type: "note",
      direction: "internal",
      body: noteBody,
      is_omara_logged: true,
    })
    .select("id, body, created_at")
    .single();

  if (error || !note) {
    return NextResponse.json({ error: error?.message ?? "Failed to create note." }, { status: 500 });
  }

  return NextResponse.json({
    note: {
      id: note.id,
      body: note.body,
      author: profile.full_name ?? null,
      created_at: note.created_at,
    },
  });
}
