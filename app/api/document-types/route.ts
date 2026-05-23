import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// GET /api/document-types?visaSubclass=482&caseId=xxx
// Returns document_types for the given visa subclass (plus any with null subclass).
// When caseId is provided, also marks already_added=true for docs already in that case.
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
  const caseId = searchParams.get("caseId");

  console.log("[document-types] GET params:", { visaSubclass, caseId });

  let documentTypes: Array<Record<string, unknown>> = [];

  if (visaSubclass) {
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

    documentTypes = [
      ...(exact ?? []),
      ...(universal ?? []),
    ].sort((a, b) => {
      const ao = a.sort_order as number;
      const bo = b.sort_order as number;
      if (ao !== bo) return ao - bo;
      return (a.label as string).localeCompare(b.label as string);
    });

    console.log("[document-types] results:", {
      visaSubclass,
      exactCount: exact?.length ?? 0,
      universalCount: universal?.length ?? 0,
      total: documentTypes.length,
    });
  } else {
    const { data, error } = await supabaseAdmin
      .from("document_types")
      .select(SELECT_FIELDS)
      .order("visa_subclass", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[document-types] all query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    documentTypes = (data ?? []) as Array<Record<string, unknown>>;
    console.log("[document-types] returning all:", documentTypes.length);
  }

  // If caseId provided, mark which docs are already added to this case
  if (caseId && documentTypes.length > 0) {
    const { data: existing } = await supabaseAdmin
      .from("case_documents")
      .select("label, template_document_id")
      .eq("case_id", caseId);

    const existingLabels = new Set((existing ?? []).map((d) => (d.label as string).toLowerCase()));
    const existingTemplateIds = new Set(
      (existing ?? [])
        .map((d) => d.template_document_id as string | null)
        .filter(Boolean)
    );

    documentTypes = documentTypes.map((dt) => ({
      ...dt,
      already_added:
        existingTemplateIds.has(dt.id as string) ||
        existingLabels.has((dt.label as string).toLowerCase()),
    }));
  }

  return NextResponse.json({ documentTypes });
}
