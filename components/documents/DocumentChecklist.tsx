"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Download,
  Eye,
  Plus,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Library,
  X,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  MessageSquare,
  CalendarClock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FileUploader } from "./FileUploader";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CaseDocument {
  id: string;
  label: string;
  status: string;
  overall_status: string;
  file_name: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  review_notes: string | null;
  storage_path: string | null;
  is_required: boolean;
  portal_upload: string | null;
  description: string | null;
  category: string | null;
  sort_order: number;
  tracks_expiry: boolean;
  multiple_files_allowed: boolean;
}

export interface DocumentFile {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  review_status: string;
  review_notes: string | null;
  reviewed_at: string | null;
  uploaded_at: string;
  uploaded_by_portal: string | null;
  uploader: { full_name: string } | null;
  reviewer: { full_name: string } | null;
}

interface DocumentTypeItem {
  id: string;
  label: string;
  is_required: boolean;
  portal_upload: string | null;
  description: string | null;
  category: string | null;
  conditional: boolean;
  tracks_expiry: boolean;
  multiple_files_allowed: boolean;
}

interface Props {
  documents: CaseDocument[];
  caseId: string;
  visaSubclass: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "identity",
  "education",
  "employment",
  "financial",
  "relationship",
  "health",
  "business",
  "legal",
  "internal",
];

const CATEGORY_LABELS: Record<string, string> = {
  identity: "Identity",
  education: "Education & Qualifications",
  employment: "Employment",
  financial: "Financial",
  relationship: "Relationship",
  health: "Health & Character",
  business: "Business",
  legal: "Legal & Compliance",
  internal: "Internal (Agent Only)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ── Status indicator (inline, not a pill) ─────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Approved
        </span>
      );
    case "uploaded":
    case "under_review":
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
          <Clock className="h-3.5 w-3.5" />
          Under Review
        </span>
      );
    case "rejected":
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
          <XCircle className="h-3.5 w-3.5" />
          Rejected
        </span>
      );
    case "waived":
      return <span className="text-xs text-slate-400">Waived</span>;
    case "not_applicable":
      return <span className="text-xs text-slate-400">N/A</span>;
    default: // missing / pending
      return <span className="text-xs font-medium text-red-500">Missing</span>;
  }
}

// ── Portal pill ───────────────────────────────────────────────────────────────

function PortalPill({ portalUpload }: { portalUpload: string | null }) {
  if (portalUpload === "client")
    return <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">Client</span>;
  if (portalUpload === "sponsor")
    return <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">Sponsor</span>;
  return <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Agent</span>;
}

// ── Expiry badge ──────────────────────────────────────────────────────────────

function ExpiryBadge({ expiry }: { expiry: string }) {
  const days = daysUntil(expiry);
  if (days < 0)
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-red-600">
        <CalendarClock className="h-3 w-3" />
        Expired
      </span>
    );
  if (days <= 30)
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-red-500">
        <CalendarClock className="h-3 w-3" />
        Exp. {days}d
      </span>
    );
  if (days <= 90)
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-amber-600">
        <CalendarClock className="h-3 w-3" />
        Exp. {days}d
      </span>
    );
  return null;
}

// ── Per-file row (inside expanded section) ────────────────────────────────────

function FileRow({
  file,
  onReview,
  onDelete,
}: {
  file: DocumentFile;
  onReview: (file: DocumentFile) => void;
  onDelete: (fileId: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const uploaderName =
    file.uploaded_by_portal === "client" ? "Client"
    : file.uploaded_by_portal === "sponsor" ? "Sponsor"
    : file.uploader?.full_name ?? "Agent";

  const handleDownload = async () => {
    setDownloading(true);
    const res = await fetch(`/api/documents/${file.id}/download?file=true`);
    if (res.ok) {
      const { signedUrl } = await res.json();
      window.open(signedUrl, "_blank");
    }
    setDownloading(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/documents/files/${file.id}/delete`, { method: "DELETE" });
    setDeleting(false);
    setConfirmDelete(false);
    if (res.ok) onDelete(file.id);
  };

  const statusCls =
    file.review_status === "approved" ? "text-emerald-600"
    : file.review_status === "rejected" ? "text-red-600"
    : "text-amber-600";

  const statusLabel =
    file.review_status === "approved" ? "Approved"
    : file.review_status === "rejected" ? "Rejected"
    : "Awaiting Review";

  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-100 bg-white px-3 py-2">
      <FileText className="h-3.5 w-3.5 shrink-0 text-slate-300" />
      <div className="min-w-0 flex-1">
        <span className="truncate text-xs font-medium text-slate-700">{file.file_name}</span>
        <span className="ml-2 text-xs text-slate-400">
          {file.file_size ? formatBytes(file.file_size) : ""} · {formatDate(file.uploaded_at)} · {uploaderName}
        </span>
      </div>
      <span className={cn("shrink-0 text-xs font-medium", statusCls)}>{statusLabel}</span>
      {file.expiry_date && <ExpiryBadge expiry={file.expiry_date} />}
      {file.review_status === "rejected" && file.review_notes && (
        <span className="max-w-[140px] truncate text-xs text-red-500" title={file.review_notes}>{file.review_notes}</span>
      )}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="rounded p-1 text-slate-300 hover:text-slate-500 disabled:opacity-50"
          title="Download"
        >
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        </button>
        {file.review_status === "pending" && (
          <button
            type="button"
            onClick={() => onReview(file)}
            className="rounded p-1 text-slate-300 hover:text-slate-500"
            title="Review"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}
        {confirmDelete ? (
          <>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-600 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-600">No</button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded p-1 text-slate-200 hover:text-red-400"
            title="Delete file"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Document requirement row ───────────────────────────────────────────────────

function DocRow({
  doc,
  onReview,
  onDocUpdated,
  onDeleted,
}: {
  doc: CaseDocument;
  onReview: (file: DocumentFile, doc: CaseDocument) => void;
  onDocUpdated: (docId: string, patch: Partial<CaseDocument>) => void;
  onDeleted: (docId: string) => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const overallStatus = doc.overall_status || (doc.status === "pending" ? "missing" : doc.status);

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    const res = await fetch(`/api/documents/${doc.id}/files`);
    if (res.ok) {
      const data = await res.json();
      setFiles(data.files ?? []);
    }
    setLoadingFiles(false);
  }, [doc.id]);

  useEffect(() => {
    if (expanded) loadFiles();
  }, [expanded, loadFiles]);

  const handleFileDeleted = async (fileId: string) => {
    const remaining = files.filter((f) => f.id !== fileId);
    setFiles(remaining);
    onDocUpdated(doc.id, { overall_status: remaining.length === 0 ? "missing" : "uploaded" });
    router.refresh();
  };

  const handleDeleteRequirement = async () => {
    setDeleting(true);
    const res = await fetch(`/api/documents/${doc.id}/delete`, { method: "DELETE" });
    setDeleting(false);
    setConfirmDelete(false);
    if (res.ok) onDeleted(doc.id);
  };

  const nearestExpiry = files
    .filter((f) => f.expiry_date)
    .map((f) => f.expiry_date!)
    .sort()[0];

  const uploadLabel = overallStatus === "rejected" ? "Re-upload"
    : files.length > 0 && doc.multiple_files_allowed ? "Upload Another"
    : "Upload";

  return (
    <div className={cn("border-b border-slate-100 last:border-0", expanded && "bg-slate-50/30")}>
      {/* Main row — single line */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        {/* Expand chevron */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 text-slate-300 hover:text-slate-500"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        {/* Document name */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
          {doc.label}
        </span>

        {/* Badges */}
        <div className="flex shrink-0 items-center gap-1.5">
          {doc.is_required
            ? <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">Required</span>
            : <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">Optional</span>
          }
          <PortalPill portalUpload={doc.portal_upload} />
          {files.length > 0 && (
            <span className="text-[10px] text-slate-400">{files.length} file{files.length !== 1 ? "s" : ""}</span>
          )}
          {nearestExpiry && <ExpiryBadge expiry={nearestExpiry} />}
        </div>

        {/* Status */}
        <div className="w-28 shrink-0 text-right">
          <StatusChip status={overallStatus} />
        </div>

        {/* Upload button — always visible for agent */}
        {showUpload ? null : (
          <button
            type="button"
            onClick={() => { setExpanded(true); setShowUpload(true); }}
            className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Upload className="h-3 w-3" />
            {uploadLabel}
          </button>
        )}

        {/* Delete requirement */}
        {confirmDelete ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleDeleteRequirement}
              disabled={deleting}
              className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="rounded px-2 py-1 text-xs text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 rounded p-1 text-slate-200 hover:text-red-400 transition-colors"
            title="Remove requirement"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Rejection note (below row, when collapsed) */}
      {!expanded && overallStatus === "rejected" && doc.review_notes && (
        <p className="px-10 pb-2 text-xs text-red-500">
          <AlertCircle className="mr-1 inline h-3 w-3" />
          {doc.review_notes}
        </p>
      )}

      {/* Expanded: upload widget + file list */}
      {expanded && (
        <div className="px-10 pb-3 space-y-2">
          {showUpload && (
            <FileUploader
              documentId={doc.id}
              onSuccess={() => {
                setShowUpload(false);
                loadFiles();
                onDocUpdated(doc.id, { overall_status: "uploaded" });
                router.refresh();
              }}
              onCancel={() => setShowUpload(false)}
            />
          )}

          {loadingFiles ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 py-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading files…
            </div>
          ) : files.length > 0 ? (
            <div className="space-y-1.5">
              {files.map((f) => (
                <FileRow
                  key={f.id}
                  file={f}
                  onReview={(file) => onReview(file, doc)}
                  onDelete={handleFileDeleted}
                />
              ))}
            </div>
          ) : !showUpload ? (
            <p className="text-xs text-slate-400 py-1">No files uploaded yet.</p>
          ) : null}

          {/* "Upload Another" link when files already exist and upload widget is closed */}
          {!showUpload && doc.multiple_files_allowed && files.length > 0 && (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Upload Another
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DocumentChecklist({ documents: initialDocuments, caseId, visaSubclass }: Props) {
  const router = useRouter();

  const [documents, setDocuments] = useState<CaseDocument[]>(initialDocuments);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [portalFilter, setPortalFilter] = useState<string>("all");

  // Review modal
  const [reviewFile, setReviewFile] = useState<DocumentFile | null>(null);
  const [reviewDoc, setReviewDoc] = useState<CaseDocument | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected">("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Add document modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addPortalUpload, setAddPortalUpload] = useState("");
  const [addRequired, setAddRequired] = useState(true);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Load standard docs modal
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [docTypes, setDocTypes] = useState<DocumentTypeItem[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [submittingLoad, setSubmittingLoad] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadResult, setLoadResult] = useState<{ created: number; skipped: number } | null>(null);

  // AI request modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [generatingRequest, setGeneratingRequest] = useState(false);
  const [requestResult, setRequestResult] = useState<{
    clientMessage: string | null;
    sponsorMessage: string | null;
    clientDocs: string[];
    sponsorDocs: string[];
  } | null>(null);
  const [requestTab, setRequestTab] = useState<"client" | "sponsor">("client");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [copiedClient, setCopiedClient] = useState(false);
  const [copiedSponsor, setCopiedSponsor] = useState(false);
  const [editableClientMsg, setEditableClientMsg] = useState("");
  const [editableSponsorMsg, setEditableSponsorMsg] = useState("");

  useEffect(() => { setDocuments(initialDocuments); }, [initialDocuments]);

  const handleDocUpdated = (docId: string, patch: Partial<CaseDocument>) =>
    setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, ...patch } : d));

  const handleDocDeleted = (docId: string) =>
    setDocuments((prev) => prev.filter((d) => d.id !== docId));

  // Stats
  const approved = documents.filter((d) => (d.overall_status || d.status) === "approved").length;
  const missing = documents.filter((d) => {
    const s = d.overall_status || d.status;
    return s === "missing" || s === "pending";
  }).length;
  const rejected = documents.filter((d) => (d.overall_status || d.status) === "rejected").length;

  // Filter
  const filtered = documents.filter((d) => {
    const s = d.overall_status || d.status;
    if (statusFilter !== "all") {
      if (statusFilter === "missing" && s !== "missing" && s !== "pending") return false;
      if (statusFilter !== "missing" && s !== statusFilter) return false;
    }
    if (portalFilter !== "all") {
      if (portalFilter === "agent" && d.portal_upload !== null) return false;
      if (portalFilter !== "agent" && d.portal_upload !== portalFilter) return false;
    }
    return true;
  });

  // Group by category
  const grouped = CATEGORY_ORDER
    .map((cat) => ({
      cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      docs: filtered
        .filter((d) => (d.category ?? "legal") === cat)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }))
    .filter((g) => g.docs.length > 0);

  const uncategorised = filtered.filter(
    (d) => !d.category || !CATEGORY_ORDER.includes(d.category)
  );

  // Review
  function openReview(file: DocumentFile, doc: CaseDocument) {
    setReviewFile(file);
    setReviewDoc(doc);
    setReviewStatus("approved");
    setReviewNotes("");
    setReviewError(null);
  }

  async function submitReview() {
    if (!reviewFile) return;
    setSubmittingReview(true);
    setReviewError(null);
    const res = await fetch(`/api/documents/files/${reviewFile.id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review_status: reviewStatus, review_notes: reviewNotes }),
    });
    if (!res.ok) {
      const data = await res.json();
      setReviewError(data.error ?? "Failed to submit review.");
      setSubmittingReview(false);
      return;
    }
    const data = await res.json();
    if (data.caseDocumentId && data.overallStatus) {
      handleDocUpdated(data.caseDocumentId, { overall_status: data.overallStatus });
    }
    setSubmittingReview(false);
    setReviewFile(null);
    setReviewDoc(null);
    router.refresh();
  }

  // Add document
  async function submitAdd() {
    if (!addLabel.trim()) return;
    setSubmittingAdd(true);
    setAddError(null);
    const res = await fetch("/api/documents/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id: caseId,
        label: addLabel.trim(),
        description: addDescription.trim() || null,
        portal_upload: addPortalUpload || null,
        is_required: addRequired,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setAddError(data.error ?? "Failed to add document.");
      setSubmittingAdd(false);
      return;
    }
    setSubmittingAdd(false);
    setShowAddModal(false);
    setAddLabel("");
    setAddDescription("");
    setAddPortalUpload("");
    setAddRequired(true);
    router.refresh();
  }

  // Load standard docs
  async function openLoadModal() {
    setShowLoadModal(true);
    setLoadError(null);
    setLoadResult(null);
    setDocTypes([]);
    setCheckedIds(new Set());
    setLoadingTypes(true);
    const qs = visaSubclass ? `?visaSubclass=${encodeURIComponent(visaSubclass)}` : "";
    const res = await fetch(`/api/document-types${qs}`);
    if (res.ok) {
      const data = await res.json() as { documentTypes: DocumentTypeItem[] };
      const types = data.documentTypes ?? [];
      setDocTypes(types);
      setCheckedIds(new Set(types.filter((dt) => dt.is_required || dt.conditional).map((dt) => dt.id)));
    } else {
      setLoadError("Failed to load standard documents.");
    }
    setLoadingTypes(false);
  }

  async function submitLoad() {
    if (checkedIds.size === 0) return;
    setSubmittingLoad(true);
    setLoadError(null);
    const res = await fetch(`/api/cases/${caseId}/documents/load-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedIds: Array.from(checkedIds) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoadError(data.error ?? "Failed to load documents.");
      setSubmittingLoad(false);
      return;
    }
    setLoadResult({ created: data.created?.length ?? 0, skipped: data.skipped ?? 0 });
    setSubmittingLoad(false);
    router.refresh();
  }

  // AI request
  async function openRequestModal() {
    setShowRequestModal(true);
    setRequestError(null);
    setRequestResult(null);
    setGeneratingRequest(true);
    const res = await fetch(`/api/cases/${caseId}/documents/request-message`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setRequestError(data.error ?? "Failed to generate request message.");
      setGeneratingRequest(false);
      return;
    }
    const data = await res.json();
    setRequestResult(data);
    setEditableClientMsg(data.clientMessage ?? "");
    setEditableSponsorMsg(data.sponsorMessage ?? "");
    if (!data.clientMessage && data.sponsorMessage) setRequestTab("sponsor");
    setGeneratingRequest(false);
  }

  async function copyToClipboard(text: string, type: "client" | "sponsor") {
    await navigator.clipboard.writeText(text);
    if (type === "client") { setCopiedClient(true); setTimeout(() => setCopiedClient(false), 2000); }
    else { setCopiedSponsor(true); setTimeout(() => setCopiedSponsor(false), 2000); }
  }

  // Load modal grouped
  const LOAD_CATEGORY_ORDER = [...CATEGORY_ORDER, "other"];
  const loadModalGrouped = LOAD_CATEGORY_ORDER
    .map((cat) => ({
      cat,
      label: cat === "other" ? "Other" : (CATEGORY_LABELS[cat] ?? cat),
      items: docTypes.filter((dt) =>
        cat === "other"
          ? (!dt.category || !CATEGORY_ORDER.includes(dt.category))
          : dt.category === cat
      ),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Documents</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {approved}/{documents.length} approved
              {missing > 0 && <span className="ml-2 text-red-500">{missing} missing</span>}
              {rejected > 0 && <span className="ml-2 text-red-500">{rejected} rejected</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(missing + rejected) > 0 && (
              <button
                type="button"
                onClick={openRequestModal}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <MessageSquare className="h-4 w-4" />
                Request Docs
              </button>
            )}
            {visaSubclass && (
              <button
                type="button"
                onClick={openLoadModal}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Library className="h-4 w-4" />
                Load Standard Docs
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" />
              Add Document
            </button>
          </div>
        </div>

        {/* Filters */}
        {documents.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1 py-1">
              {([["all","All"],["missing","Missing"],["uploaded","Under Review"],["approved","Approved"],["rejected","Rejected"]] as const).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setStatusFilter(v)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    statusFilter === v ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-700"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1 py-1">
              {([["all","All"],["client","Client"],["sponsor","Sponsor"],["agent","Agent"]] as const).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPortalFilter(v)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    portalFilter === v ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-700"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Empty states ───────────────────────────────────────────── */}
      {documents.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white">
          <div className="text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-200" />
            <p className="mt-2 text-sm text-slate-400">No documents yet.</p>
            <p className="text-xs text-slate-400">Click &quot;Load Standard Docs&quot; to add the standard checklist.</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-400">
          No documents match the current filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {grouped.map(({ cat, label, docs }, gi) => (
            <div key={cat}>
              {/* Category header — flat label, no card/box */}
              <div className={cn(
                "flex items-center gap-2 px-4 py-1.5",
                gi > 0 && "border-t border-slate-100"
              )}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
              </div>
              {docs.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  onReview={openReview}
                  onDocUpdated={handleDocUpdated}
                  onDeleted={handleDocDeleted}
                />
              ))}
            </div>
          ))}

          {uncategorised.length > 0 && (
            <div className={cn(grouped.length > 0 && "border-t border-slate-100")}>
              <div className="flex items-center gap-2 px-4 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Other</span>
              </div>
              {uncategorised.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  onReview={openReview}
                  onDocUpdated={handleDocUpdated}
                  onDeleted={handleDocDeleted}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Review modal ───────────────────────────────────────────── */}
      {reviewFile && reviewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) { setReviewFile(null); setReviewDoc(null); } }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-800">Review File</h3>
            <p className="mt-0.5 text-sm text-slate-500">{reviewDoc.label}</p>

            <div className="mt-3 flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{reviewFile.file_name}</span>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch(`/api/documents/${reviewFile.id}/download?file=true`);
                  if (res.ok) { const { signedUrl } = await res.json(); window.open(signedUrl, "_blank"); }
                }}
                className="ml-auto shrink-0 text-slate-400 hover:text-slate-600"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              {(["approved", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReviewStatus(s)}
                  className={cn(
                    "flex-1 rounded-md border py-2 text-sm font-medium transition-colors",
                    reviewStatus === s
                      ? s === "approved"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-red-400 bg-red-50 text-red-700"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {s === "approved" ? "Approve" : "Reject"}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Notes{reviewStatus === "rejected" && <span className="text-red-500"> *</span>}
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewStatus === "rejected" ? "Reason for rejection…" : "Optional notes…"}
                className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
              />
            </div>

            {reviewError && <p className="mt-2 text-xs text-red-600">{reviewError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setReviewFile(null); setReviewDoc(null); }} disabled={submittingReview} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={submitReview} disabled={submittingReview} className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
                {submittingReview && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Load Standard Docs modal ───────────────────────────────── */}
      {showLoadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !submittingLoad) setShowLoadModal(false); }}
        >
          <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Load Standard Documents</h3>
                <p className="mt-0.5 text-xs text-slate-400">SC-{visaSubclass} standard checklist</p>
              </div>
              <button type="button" onClick={() => setShowLoadModal(false)} disabled={submittingLoad} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingTypes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : loadError && docTypes.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />{loadError}
                </div>
              ) : docTypes.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No standard documents found for SC-{visaSubclass}.</p>
              ) : (
                <>
                  <p className="mb-3 text-xs text-slate-500">
                    <span className="font-semibold text-red-600">Required</span> and <span className="font-semibold text-amber-600">conditional</span> docs are pre-checked.
                    Optional docs are unchecked — add any you need.
                  </p>

                  {loadModalGrouped.map(({ cat, label: grpLabel, items }) => (
                    <div key={cat} className="mb-4">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{grpLabel}</p>
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        {items.map((dt, idx) => (
                          <label
                            key={dt.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-slate-50",
                              idx < items.length - 1 && "border-b border-slate-100"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checkedIds.has(dt.id)}
                              onChange={() => {
                                setCheckedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(dt.id)) next.delete(dt.id);
                                  else next.add(dt.id);
                                  return next;
                                });
                              }}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#0f172a]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-sm font-medium text-slate-800">{dt.label}</span>
                                {dt.is_required
                                  ? <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">Required</span>
                                  : dt.conditional
                                  ? <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Conditional</span>
                                  : <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">Optional</span>
                                }
                                {dt.portal_upload === "client" && <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">Client</span>}
                                {dt.portal_upload === "sponsor" && <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">Sponsor</span>}
                                {dt.tracks_expiry && <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">Expiry tracked</span>}
                              </div>
                              {dt.description && <p className="mt-0.5 text-xs text-slate-400">{dt.description}</p>}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {loadError && (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />{loadError}
                    </div>
                  )}
                  {loadResult && (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      {loadResult.created} document{loadResult.created !== 1 ? "s" : ""} added
                      {loadResult.skipped > 0 && <>, {loadResult.skipped} skipped (already exist)</>}.
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 shrink-0">
              <span className="text-xs text-slate-400">{checkedIds.size} of {docTypes.length} selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowLoadModal(false)} disabled={submittingLoad} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                  {loadResult ? "Done" : "Cancel"}
                </button>
                {!loadResult && (
                  <button
                    type="button"
                    onClick={submitLoad}
                    disabled={submittingLoad || checkedIds.size === 0 || loadingTypes}
                    className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingLoad && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Add {checkedIds.size > 0 ? checkedIds.size : ""} Doc{checkedIds.size !== 1 ? "s" : ""}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Document modal ─────────────────────────────────────── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-800">Add Document</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Document name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  placeholder="e.g. Employment contract"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Description</label>
                <input
                  type="text"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Optional guidance…"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Uploaded by</label>
                <select
                  value={addPortalUpload}
                  onChange={(e) => setAddPortalUpload(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
                >
                  <option value="">Agent</option>
                  <option value="client">Client Portal</option>
                  <option value="sponsor">Sponsor Portal</option>
                </select>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={addRequired} onChange={(e) => setAddRequired(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#0f172a]" />
                <span className="text-sm text-slate-700">Required document</span>
              </label>
            </div>
            {addError && <p className="mt-3 text-xs text-red-600">{addError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddModal(false)} disabled={submittingAdd} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={submitAdd} disabled={!addLabel.trim() || submittingAdd} className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                {submittingAdd && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Request Message modal ───────────────────────────────── */}
      {showRequestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !generatingRequest) setShowRequestModal(false); }}
        >
          <div className="flex max-h-[88vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Request Missing Documents</h3>
                <p className="mt-0.5 text-xs text-slate-400">AI-generated — review and edit before sending</p>
              </div>
              <button type="button" onClick={() => setShowRequestModal(false)} disabled={generatingRequest} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {generatingRequest ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                  <p className="text-sm text-slate-400">Generating request message…</p>
                </div>
              ) : requestError ? (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />{requestError}
                </div>
              ) : requestResult ? (
                <div className="space-y-4">
                  {requestResult.clientMessage && requestResult.sponsorMessage && (
                    <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
                      <button type="button" onClick={() => setRequestTab("client")} className={cn("rounded-md px-3 py-1.5 text-xs font-medium", requestTab === "client" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700")}>
                        Client ({requestResult.clientDocs.length})
                      </button>
                      <button type="button" onClick={() => setRequestTab("sponsor")} className={cn("rounded-md px-3 py-1.5 text-xs font-medium", requestTab === "sponsor" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700")}>
                        Sponsor ({requestResult.sponsorDocs.length})
                      </button>
                    </div>
                  )}

                  {(requestTab === "client" || !requestResult.sponsorMessage) && requestResult.clientMessage && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-xs text-slate-400">{requestResult.clientDocs.length} doc{requestResult.clientDocs.length !== 1 ? "s" : ""} requested</p>
                        <button type="button" onClick={() => copyToClipboard(editableClientMsg, "client")} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                          {copiedClient ? <><Check className="h-3.5 w-3.5 text-emerald-500" />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                        </button>
                      </div>
                      <textarea rows={12} value={editableClientMsg} onChange={(e) => setEditableClientMsg(e.target.value)} className="w-full resize-none rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none" />
                    </div>
                  )}

                  {(requestTab === "sponsor" || !requestResult.clientMessage) && requestResult.sponsorMessage && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-xs text-slate-400">{requestResult.sponsorDocs.length} doc{requestResult.sponsorDocs.length !== 1 ? "s" : ""} from sponsor</p>
                        <button type="button" onClick={() => copyToClipboard(editableSponsorMsg, "sponsor")} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                          {copiedSponsor ? <><Check className="h-3.5 w-3.5 text-emerald-500" />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                        </button>
                      </div>
                      <textarea rows={12} value={editableSponsorMsg} onChange={(e) => setEditableSponsorMsg(e.target.value)} className="w-full resize-none rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none" />
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 shrink-0">
              <button type="button" onClick={openRequestModal} disabled={generatingRequest} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50">
                <RefreshCw className="h-3.5 w-3.5" />Regenerate
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowRequestModal(false)} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Close</button>
                {requestResult && (
                  <button type="button" onClick={() => copyToClipboard(requestTab === "client" ? editableClientMsg : editableSponsorMsg, requestTab)} className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                    <Copy className="h-4 w-4" />Copy Message
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
