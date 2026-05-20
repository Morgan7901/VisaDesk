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

  console.log("[document-types] GET params:", { visaSubclass });

  let documentTypes: unknown[] = [];

  if (visaSubclass) {
    // Run two separate queries and merge — avoids any edge-cases with .or() + is.null
    const [{ data: exact, error: exactErr }, { data: universal, error: universalErr }] =
      await Promise.all([
        supabaseAdmin
          .from("document_types")
          .select("id, label, is_required, portal_upload, description")
          .eq("visa_subclass", visaSubclass)
          .order("label"),
        supabaseAdmin
          .from("document_types")
          .select("id, label, is_required, portal_upload, description")
          .is("visa_subclass", null)
          .order("label"),
      ]);

    if (exactErr) {
      console.error("[document-types] exact query error:", exactErr.message);
      return NextResponse.json({ error: exactErr.message }, { status: 500 });
    }
    if (universalErr) {
      console.error("[document-types] universal query error:", universalErr.message);
      return NextResponse.json({ error: universalErr.message }, { status: 500 });
    }

    documentTypes = [
      ...(exact ?? []),
      ...(universal ?? []),
    ].sort((a: {label:string}, b: {label:string}) => a.label.localeCompare(b.label));

    console.log("[document-types] results:", {
      visaSubclass,
      exactCount: exact?.length ?? 0,
      universalCount: universal?.length ?? 0,
      total: documentTypes.length,
    });
  } else {
    // No subclass filter — return all
    const { data, error } = await supabaseAdmin
      .from("document_types")
      .select("id, label, is_required, portal_upload, description")
      .order("label");

    if (error) {
      console.error("[document-types] all query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    documentTypes = data ?? [];
    console.log("[document-types] returning all:", documentTypes.length);
  }

  return NextResponse.json({ documentTypes });
}
