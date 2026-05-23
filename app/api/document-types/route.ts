import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// GET /api/document-types?visaSubclass=482
// Returns document_types for the given visa subclass (plus any with null subclass).
// Now includes all new fields: category, tracks_expiry, multiple_files_allowed, conditional, etc.
// Requires authentication — this is an agent-facing endpoint.

const SELECT_FIELDS = `
  id, label, is_required, portal_upload, description,
  category, sort_order, tracks_expiry, multiple_files_allowed,
  conditional, internal_only, sponsor_visible, ai_requestable
`;

export async function GET(request: Request) {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const visaSubclass = searchParams.get("visaSubclass");

  console.log("[document-types] GET params:", { visaSubclass });

  let documentTypes: unknown[] = [];

  if (visaSubclass) {
    // Run two separate queries and merge — avoids edge-cases with .or() + is.null
    const [{ data: exact, error: exactErr }, { data: universal, error: universalErr }] =
      await Promise.all([
        supabaseAdmin
          .from("document_types")
          .select(SELECT_FIELDS)
          .eq("visa_subclass", visaSubclass)
          .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("document_types")
          .select(SELECT_FIELDS)
          .is("visa_subclass", null)
          .order("sort_order", { ascending: true }),
      ]);

    if (exactErr) {
      console.error("[document-types] exact query error:", exactErr.message);
      return NextResponse.json({ error: exactErr.message }, { status: 500 });
    }
    if (universalErr) {
      console.error("[document-types] universal query error:", universalErr.message);
      return NextResponse.json({ error: universalErr.message }, { status: 500 });
    }

    // Sort by sort_order, then label within groups
    documentTypes = [
      ...(exact ?? []),
      ...(universal ?? []),
    ].sort((a: { sort_order: number; label: string }, b: { sort_order: number; label: string }) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.label.localeCompare(b.label);
    });

    console.log("[document-types] results:", {
      visaSubclass,
      exactCount: exact?.length ?? 0,
      universalCount: universal?.length ?? 0,
      total: documentTypes.length,
    });
  } else {
    // No subclass filter — return all, ordered by subclass then sort_order
    const { data, error } = await supabaseAdmin
      .from("document_types")
      .select(SELECT_FIELDS)
      .order("visa_subclass", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[document-types] all query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    documentTypes = data ?? [];
    console.log("[document-types] returning all:", documentTypes.length);
  }

  return NextResponse.json({ documentTypes });
}
