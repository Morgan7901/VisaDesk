import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// POST /api/documents/create
// Creates a single case_document, either from a template (template_document_id provided)
// or as a fully custom document.
//
// Body:
//   case_id               string   required
//   label                 string   required
//   description?          string
//   portal_upload?        "client" | "sponsor" | null
//   is_required?          boolean  (default true)
//   tracks_expiry?        boolean
//   multiple_files_allowed? boolean (default true)
//   template_document_id? string   — when set, copies metadata from document_types row

export async function POST(request: Request) {
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

  const body = await request.json();
  const {
    case_id,
    label,
    description,
    portal_upload,
    is_required,
    tracks_expiry,
    multiple_files_allowed,
    template_document_id,
  }: {
    case_id: string;
    label: string;
    description?: string;
    portal_upload?: string | null;
    is_required?: boolean;
    tracks_expiry?: boolean;
    multiple_files_allowed?: boolean;
    template_document_id?: string | null;
  } = body;

  if (!case_id || !label?.trim()) {
    return NextResponse.json({ error: "case_id and label are required." }, { status: 400 });
  }

  // Verify the case belongs to the user's firm
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id, visa_subclass")
    .eq("id", case_id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  // Check for duplicate label in this case
  const { data: existing } = await supabaseAdmin
    .from("case_documents")
    .select("id, label")
    .eq("case_id", case_id)
    .ilike("label", label.trim());

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: `A document named "${label.trim()}" already exists in this case.` }, { status: 409 });
  }

  let resolvedDocTypeId: string | null = template_document_id ?? null;
  let resolvedPortalUpload: string | null = portal_upload ?? null;
  let resolvedTracksExpiry = tracks_expiry ?? false;
  let resolvedMultipleFiles = multiple_files_allowed ?? true;
  let resolvedIsRequired = is_required ?? true;
  let resolvedCategory: string | null = null;
  let resolvedSortOrder = 0;

  if (template_document_id) {
    // Template mode: fetch the document_type to copy metadata
    const { data: tmpl } = await supabaseAdmin
      .from("document_types")
      .select("id, label, is_required, portal_upload, tracks_expiry, multiple_files_allowed, category, sort_order")
      .eq("id", template_document_id)
      .single();

    if (!tmpl) {
      return NextResponse.json({ error: "Template document type not found." }, { status: 404 });
    }

    resolvedDocTypeId = tmpl.id;
    // Use template values unless caller explicitly overrides
    resolvedPortalUpload = portal_upload !== undefined ? (portal_upload ?? null) : (tmpl.portal_upload ?? null);
    resolvedTracksExpiry = tracks_expiry !== undefined ? (tracks_expiry ?? false) : (tmpl.tracks_expiry ?? false);
    resolvedMultipleFiles = multiple_files_allowed !== undefined ? (multiple_files_allowed ?? true) : (tmpl.multiple_files_allowed ?? true);
    resolvedIsRequired = is_required !== undefined ? (is_required ?? true) : (tmpl.is_required ?? true);
    resolvedCategory = tmpl.category ?? null;
    resolvedSortOrder = tmpl.sort_order ?? 0;
  } else {
    // Custom mode: create a new document_type row (visa_subclass null = custom)
    const { data: docType, error: typeErr } = await supabaseAdmin
      .from("document_types")
      .insert({
        visa_subclass: null,
        label: label.trim(),
        description: description?.trim() || null,
        is_required: is_required ?? true,
        portal_upload: portal_upload || null,
        tracks_expiry: tracks_expiry ?? false,
        multiple_files_allowed: multiple_files_allowed ?? true,
      })
      .select("id")
      .single();

    if (typeErr || !docType) {
      return NextResponse.json(
        { error: typeErr?.message ?? "Failed to create document type." },
        { status: 500 }
      );
    }
    resolvedDocTypeId = docType.id;
  }

  // Create the case_documents row
  const { data: doc, error: docErr } = await supabaseAdmin
    .from("case_documents")
    .insert({
      case_id,
      document_type_id: resolvedDocTypeId,
      template_document_id: template_document_id ?? null,
      label: label.trim(),
      status: "pending",
      overall_status: "missing",
      portal_upload: resolvedPortalUpload,
      tracks_expiry: resolvedTracksExpiry,
      multiple_files_allowed: resolvedMultipleFiles,
      category: resolvedCategory,
      sort_order: resolvedSortOrder,
    })
    .select("id, label, overall_status, category, sort_order, portal_upload, tracks_expiry, multiple_files_allowed, template_document_id")
    .single();

  if (docErr || !doc) {
    return NextResponse.json(
      { error: docErr?.message ?? "Failed to create document." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: doc.id,
    document: {
      ...doc,
      is_required: resolvedIsRequired,
      description: description?.trim() || null,
    },
  });
}
