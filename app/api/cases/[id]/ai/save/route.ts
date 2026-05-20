import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get firm_id
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  const { documentType, title, content, model } = await request.json();

  if (!documentType || !title || !content) {
    return NextResponse.json(
      { error: "documentType, title, and content are required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("ai_documents")
    .insert({
      case_id: params.id,
      firm_id: profile.firm_id,
      created_by: user.id,
      document_type: documentType,
      title,
      content,
      model: model ?? "claude-opus-4-20250514",
    })
    .select("id, document_type, title, created_at")
    .single();

  if (error) {
    console.error("[ai/save]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, document: data });
}
