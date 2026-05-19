import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// GET /api/document-types?visaSubclass=482
// Returns document_types for the given visa subclass (plus any with null subclass).
// Requires authentication — this is an agent-facing endpoint.
export async function GET(request: Request) {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const visaSubclass = searchParams.get("visaSubclass");

  let query = supabaseAdmin
    .from("document_types")
    .select("id, label, is_required, portal_upload, description")
    .order("label");

  if (visaSubclass) {
    // Match exact visa subclass OR null (applies to all)
    query = query.or(`visa_subclass.eq.${visaSubclass},visa_subclass.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documentTypes: data ?? [] });
}
