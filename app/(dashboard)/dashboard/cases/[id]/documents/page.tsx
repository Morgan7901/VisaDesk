import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  DocumentChecklist,
  type CaseDocument,
} from "@/components/documents/DocumentChecklist";


export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auth via session client
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) redirect("/login");

  // Fetch case visa_subclass
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("visa_subclass")
    .eq("id", id)
    .single();

  // Fetch documents with all new fields via admin client
  const { data: rawDocs } = await supabaseAdmin
    .from("case_documents")
    .select(`
      id, label, status, overall_status,
      file_name, file_size, uploaded_at, review_notes, storage_path,
      category, sort_order, tracks_expiry, multiple_files_allowed,
      portal_upload,
      document_types!document_type_id(description, is_required, portal_upload, category, conditional)
    `)
    .eq("case_id", id)
    .order("sort_order", { ascending: true });

  type DocType = {
    description: string | null;
    is_required: boolean;
    portal_upload: string | null;
    category: string | null;
    conditional: boolean;
  };

  const arr = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const documents: CaseDocument[] = (rawDocs ?? []).map((doc) => {
    const dtype = arr(doc.document_types as DocType | DocType[] | null);
    const overallStatus = doc.overall_status ?? (doc.status === "pending" ? "missing" : doc.status);
    return {
      id: doc.id,
      label: doc.label,
      status: doc.status,
      overall_status: overallStatus,
      file_name: doc.file_name ?? null,
      file_size: doc.file_size ?? null,
      uploaded_at: doc.uploaded_at ?? null,
      review_notes: doc.review_notes ?? null,
      storage_path: doc.storage_path ?? null,
      is_required: dtype?.is_required ?? true,
      portal_upload: doc.portal_upload ?? dtype?.portal_upload ?? null,
      description: dtype?.description ?? null,
      category: doc.category ?? dtype?.category ?? null,
      sort_order: doc.sort_order ?? 0,
      tracks_expiry: doc.tracks_expiry ?? false,
      multiple_files_allowed: doc.multiple_files_allowed ?? true,
    };
  });

  return (
    <DocumentChecklist
      documents={documents}
      caseId={id}
      visaSubclass={caseRow?.visa_subclass ?? null}
    />
  );
}
