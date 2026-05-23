"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Upload,
  Download,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Plus,
  Search,
  Copy,
  RefreshCw,
  Check,
  X,
  Loader2,
  BookOpen,
  MinusCircle,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  template_document_id?: string | null;
  requested_at?: string | null;
  request_message?: string | null;
}

interface DocumentFile {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  review_status: string;
  review_notes: string | null;
  reviewed_at: string | null;
  uploaded_at: string;
  uploaded_by_portal: string | null;
  uploaded_by: string | null;
  reviewed_by: string | null;
  uploader: { full_name: string } | null;
  reviewer: { full_name: string } | null;
}

interface DocumentType {
  id: string;
  label: string;
  is_required: boolean;
  portal_upload: string | null;
  description: string | null;
  category: string | null;
  sort_order: number;
  tracks_expiry: boolean;
  multiple_files_allowed: boolean;
  conditional: boolean;
  internal_only: boolean;
  sponsor_visible: boolean;
  ai_requestable: boolean;
  already_added?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "Identity & Personal",
  "Employment & Skills",
  "Financial",
  "Health & Character",
  "Sponsor / Employer",
  "Relationship",
  "Other",
];

// "uploaded" in DB means files are pending review → display as "Under Review"
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    Icon?: React.ComponentType<{ className?: string }>;
  }
> = {
  missing: {
    label: "Missing",
    bg: "bg-slate-100",
    text: "text-slate-500",
  },
  requested: {
    label: "Requested",
    bg: "bg-blue-50",
    text: "text-blue-700",
    Icon: Send,
  },
  uploaded: {
    label: "Under Review",
    bg: "bg-amber-50",
    text: "text-amber-700",
    Icon: Clock,
  },
  approved: {
    label: "Approved",
    bg: "bg-green-50",
    text: "text-green-700",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-50",
    text: "text-red-700",
    Icon: XCircle,
  },
  waived: {
    label: "Waived",
    bg: "bg-slate-50",
    text: "text-slate-400",
    Icon: MinusCircle,
  },
  expired: {
    label: "Expired",
    bg: "bg-red-100",
    text: "text-red-800",
    Icon: AlertTriangle,
  },
};

const STATUS_FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "missing", label: "Missing" },
  { key: "requested", label: "Requested" },
  { key: "uploaded", label: "Under Review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "waived", label: "Waived" },
];

const PORTAL_FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "client", label: "Client" },
  { key: "sponsor", label: "Sponsor" },
  { key: "agent", label: "Agent Only" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd/MM/yyyy");
  } catch {
    return iso;
  }
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploaderLabel(file: DocumentFile): string {
  if (file.uploaded_by_portal === "client") return "Client";
  if (file.uploaded_by_portal === "sponsor") return "Sponsor";
  return file.uploader?.full_name ?? "Agent";
}

function getEffectiveStatus(doc: CaseDocument): string {
  return doc.overall_status ?? (doc.status === "pending" ? "missing" : doc.status);
}

function matchesPortalFilter(doc: CaseDocument, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "agent") return !doc.portal_upload;
  return doc.portal_upload === filter;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.missing;
  const Icon = cfg.Icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        cfg.bg,
        cfg.text
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}

// ── PortalBadge ───────────────────────────────────────────────────────────────

function PortalBadge({ portalUpload }: { portalUpload: string | null }) {
  if (!portalUpload) {
    return (
      <span className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500">
        Agent
      </span>
    );
  }
  if (portalUpload === "client") {
    return (
      <span className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-sky-50 text-sky-700">
        Client Portal
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700">
      Sponsor Portal
    </span>
  );
}

// ── ProgressSummary ───────────────────────────────────────────────────────────

function ProgressSummary({ documents }: { documents: CaseDocument[] }) {
  const total = documents.length;
  if (total === 0) return null;

  const counts = {
    approved: 0,
    uploaded: 0,
    requested: 0,
    missing: 0,
    rejected: 0,
    waived: 0,
  };

  for (const doc of documents) {
    const s = getEffectiveStatus(doc);
    if (s === "approved") counts.approved++;
    else if (s === "uploaded") counts.uploaded++;
    else if (s === "requested") counts.requested++;
    else if (s === "rejected") counts.rejected++;
    else if (s === "waived") counts.waived++;
    else counts.missing++;
  }

  const pct = Math.round((counts.approved / total) * 100);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Documents Progress</span>
        <span className="text-sm font-medium text-slate-600">{pct}%</span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {counts.approved > 0 && (
          <span className="font-medium text-green-600">
            {counts.approved} approved
          </span>
        )}
        {counts.uploaded > 0 && (
          <span className="text-amber-600">{counts.uploaded} under review</span>
        )}
        {counts.requested > 0 && (
          <span className="text-blue-600">{counts.requested} requested</span>
        )}
        {counts.missing > 0 && (
          <span className="text-slate-500">{counts.missing} missing</span>
        )}
        {counts.rejected > 0 && (
          <span className="text-red-600">{counts.rejected} rejected</span>
        )}
        {counts.waived > 0 && (
          <span className="text-slate-400">{counts.waived} waived</span>
        )}
        <span className="text-slate-400">{total} total</span>
      </div>
    </div>
  );
}

// ── FileReviewRow ─────────────────────────────────────────────────────────────

function FileReviewRow({
  file,
  tracksExpiry,
  caseDocumentId,
  onUpdated,
  onDeleted,
}: {
  file: DocumentFile;
  tracksExpiry: boolean;
  caseDocumentId: string;
  onUpdated: (fileId: string, patch: Partial<DocumentFile>, newOverallStatus: string) => void;
  onDeleted: (fileId: string, newOverallStatus: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState(file.review_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleApprove = async () => {
    setSaving(true);
    const res = await fetch(`/api/documents/files/${file.id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review_status: "approved", review_notes: null }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      onUpdated(file.id, { review_status: "approved", review_notes: null }, json.overallStatus);
    }
    setSaving(false);
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/documents/files/${file.id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review_status: "rejected", review_notes: rejectNote.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      onUpdated(file.id, { review_status: "rejected", review_notes: rejectNote.trim() }, json.overallStatus);
      setRejecting(false);
    }
    setSaving(false);
  };

  const handleDownload = async () => {
    const res = await fetch(`/api/documents/${file.id}/download?file=true`);
    const json = await res.json().catch(() => ({}));
    if (json.signedUrl) {
      window.open(json.signedUrl, "_blank");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const res = await fetch(`/api/documents/files/${file.id}/delete`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      onDeleted(file.id, json.overallStatus);
    }
    setDeleting(false);
    setConfirmDelete(false);
  };

  const fileStatusCfg = STATUS_CONFIG[file.review_status] ?? STATUS_CONFIG.missing;
  const FileStatusIcon = fileStatusCfg.Icon;

  const expiryDays = file.expiry_date
    ? differenceInDays(parseISO(file.expiry_date), new Date())
    : null;

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
      {/* File header row */}
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <button
            onClick={handleDownload}
            className="truncate text-left font-medium text-slate-700 hover:text-slate-900 hover:underline"
          >
            {file.file_name}
          </button>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
            <span>{uploaderLabel(file)}</span>
            <span>{fmt(file.uploaded_at)}</span>
            {file.file_size && <span>{fmtSize(file.file_size)}</span>}
          </div>
        </div>

        {/* Per-file status */}
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            fileStatusCfg.bg,
            fileStatusCfg.text
          )}
        >
          {FileStatusIcon && <FileStatusIcon className="h-3 w-3" />}
          {fileStatusCfg.label}
        </span>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={handleDownload}
            title="Download"
            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          {!confirmDelete ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete file"
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-600">Delete?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded p-1 text-red-500 hover:bg-red-50"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expiry tracking */}
      {tracksExpiry && (
        <div className="mt-2 flex flex-wrap items-center gap-4 pl-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Issue date:</span>
            <span>{fmt(file.issue_date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Expiry:</span>
            {file.expiry_date ? (
              <span
                className={cn(
                  "font-medium",
                  expiryDays !== null && expiryDays < 0
                    ? "text-red-700"
                    : expiryDays !== null && expiryDays <= 90
                    ? "text-amber-600"
                    : "text-slate-700"
                )}
              >
                {fmt(file.expiry_date)}
                {expiryDays !== null &&
                  expiryDays < 0 &&
                  ` (expired ${Math.abs(expiryDays)}d ago)`}
                {expiryDays !== null &&
                  expiryDays >= 0 &&
                  expiryDays <= 90 &&
                  ` (${expiryDays}d remaining)`}
              </span>
            ) : (
              <span className="text-slate-400">Not set</span>
            )}
          </div>
        </div>
      )}

      {/* Review notes if rejected */}
      {file.review_status === "rejected" && file.review_notes && !rejecting && (
        <div className="ml-6 mt-2 rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
          <span className="font-medium">Rejection reason: </span>
          {file.review_notes}
        </div>
      )}

      {/* Approve / Reject actions */}
      {file.review_status !== "approved" && !rejecting && (
        <div className="ml-6 mt-2 flex gap-2">
          <button
            onClick={handleApprove}
            disabled={saving}
            className="flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Approve
          </button>
          <button
            onClick={() => setRejecting(true)}
            className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            <X className="h-3 w-3" />
            Reject
          </button>
        </div>
      )}

      {/* Re-approve if already approved */}
      {file.review_status === "approved" && !rejecting && (
        <div className="ml-6 mt-2 flex gap-2">
          <button
            onClick={() => setRejecting(true)}
            className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            <X className="h-3 w-3" />
            Reject
          </button>
        </div>
      )}

      {rejecting && (
        <div className="ml-6 mt-2 space-y-2">
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Reason for rejection (required)…"
            rows={2}
            className="w-full resize-none rounded border border-red-300 px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={saving || !rejectNote.trim()}
              className="flex items-center gap-1 rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Confirm Reject
            </button>
            <button
              onClick={() => { setRejecting(false); setRejectNote(file.review_notes ?? ""); }}
              className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DocRow ────────────────────────────────────────────────────────────────────

function DocRow({
  doc: initialDoc,
  caseId,
  onUpdated,
  onDeleted,
  onRequestForDoc,
}: {
  doc: CaseDocument;
  caseId: string;
  onUpdated: (id: string, patch: Partial<CaseDocument>) => void;
  onDeleted: (id: string) => void;
  onRequestForDoc: (doc: CaseDocument) => void;
}) {
  const [doc, setDoc] = useState<CaseDocument>(initialDoc);
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [waiving, setWaiving] = useState(false);
  const [waiveReason, setWaiveReason] = useState("");
  const [confirmDocDelete, setConfirmDocDelete] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync from parent prop updates
  useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const loadFiles = useCallback(async () => {
    if (filesLoaded) return;
    setLoadingFiles(true);
    const res = await fetch(`/api/documents/${doc.id}/files`);
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setFiles(json.files ?? []);
      setFilesLoaded(true);
    }
    setLoadingFiles(false);
  }, [doc.id, filesLoaded]);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !filesLoaded) loadFiles();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`/api/documents/${doc.id}/upload`, { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));

    if (res.ok) {
      const newOverallStatus = json.overallStatus ?? "uploaded";
      const updatedDoc = { ...doc, overall_status: newOverallStatus };
      setDoc(updatedDoc);
      onUpdated(doc.id, { overall_status: newOverallStatus });
      // Refresh files list
      setFilesLoaded(false);
      const filesRes = await fetch(`/api/documents/${doc.id}/files`);
      const filesJson = await filesRes.json().catch(() => ({}));
      if (filesRes.ok) {
        setFiles(filesJson.files ?? []);
        setFilesLoaded(true);
      }
    } else {
      setUploadError(json.error ?? "Upload failed.");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleFileUpdated = (fileId: string, patch: Partial<DocumentFile>, newOverallStatus: string) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...patch } : f)));
    const updatedDoc = { ...doc, overall_status: newOverallStatus };
    setDoc(updatedDoc);
    onUpdated(doc.id, { overall_status: newOverallStatus });
  };

  const handleFileDeleted = (fileId: string, newOverallStatus: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    const updatedDoc = { ...doc, overall_status: newOverallStatus };
    setDoc(updatedDoc);
    onUpdated(doc.id, { overall_status: newOverallStatus });
  };

  const handleWaive = async () => {
    const res = await fetch(`/api/documents/${doc.id}/update`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overall_status: "waived", waived_reason: waiveReason }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      const updatedDoc = { ...doc, overall_status: "waived" };
      setDoc(updatedDoc);
      onUpdated(doc.id, { overall_status: "waived" });
      setWaiving(false);
      setWaiveReason("");
    } else {
      console.error("Waive failed:", json.error);
    }
    setShowMenu(false);
  };

  const handleMarkNA = async () => {
    const res = await fetch(`/api/documents/${doc.id}/update`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overall_status: "waived", not_applicable_reason: "Marked not applicable" }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      const updatedDoc = { ...doc, overall_status: "waived" };
      setDoc(updatedDoc);
      onUpdated(doc.id, { overall_status: "waived" });
    } else {
      console.error("Mark N/A failed:", json.error);
    }
    setShowMenu(false);
  };

  const handleDeleteDoc = async () => {
    if (!confirmDocDelete) {
      setConfirmDocDelete(true);
      return;
    }
    setDeletingDoc(true);
    const res = await fetch(`/api/documents/${doc.id}/delete`, { method: "DELETE" });
    if (res.ok) {
      onDeleted(doc.id);
    }
    setDeletingDoc(false);
    setConfirmDocDelete(false);
    setShowMenu(false);
  };

  const effectiveStatus = getEffectiveStatus(doc);
  const fileCount = filesLoaded ? files.length : null;

  // Check if any file expires within 90 days
  const hasExpiryWarning = filesLoaded && files.some((f) => {
    if (!f.expiry_date) return false;
    const days = differenceInDays(parseISO(f.expiry_date), new Date());
    return days <= 90;
  });

  const uploadLabel = effectiveStatus === "rejected"
    ? "Re-upload"
    : files.length > 0 && doc.multiple_files_allowed
    ? "Upload Another"
    : "Upload File";

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* ── Collapsed row ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50/60">
        {/* Chevron toggle */}
        <button
          onClick={handleToggle}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-600"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Document name */}
        <span className="flex-1 truncate text-sm font-medium text-slate-800">
          {doc.label}
        </span>

        {/* Badges row */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Required / Optional */}
          <span
            className={cn(
              "hidden items-center rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex",
              doc.is_required
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {doc.is_required ? "Required" : "Optional"}
          </span>

          {/* Portal badge */}
          <span className="hidden sm:inline-flex">
            <PortalBadge portalUpload={doc.portal_upload} />
          </span>

          {/* Status */}
          <StatusBadge status={effectiveStatus} />

          {/* File count */}
          {fileCount !== null && fileCount > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {fileCount} {fileCount === 1 ? "file" : "files"}
            </span>
          )}

          {/* Expiry warning */}
          {hasExpiryWarning && (
            <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              Expiry
            </span>
          )}

          {/* Upload button — always visible */}
          <button
            onClick={() => {
              if (!expanded) {
                setExpanded(true);
                if (!filesLoaded) loadFiles();
              }
              fileInputRef.current?.click();
            }}
            disabled={uploading}
            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {uploading ? "Uploading…" : uploadLabel}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />

          {/* Actions menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-7 z-20 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onRequestForDoc(doc);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Send className="h-3.5 w-3.5 text-slate-400" />
                  Request
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setWaiving(true);
                    setExpanded(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <MinusCircle className="h-3.5 w-3.5 text-slate-400" />
                  Waive
                </button>
                <button
                  onClick={handleMarkNA}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5 text-slate-400" />
                  Mark N/A
                </button>
                <div className="border-t border-slate-100" />
                {!confirmDocDelete ? (
                  <button
                    onClick={() => setConfirmDocDelete(true)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                ) : (
                  <div className="px-3 py-2">
                    <p className="mb-2 text-xs font-medium text-red-600">Delete this document?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteDoc}
                        disabled={deletingDoc}
                        className="flex-1 rounded bg-red-600 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingDoc ? "Deleting…" : "Yes, delete"}
                      </button>
                      <button
                        onClick={() => { setConfirmDocDelete(false); setShowMenu(false); }}
                        className="flex-1 rounded border border-slate-200 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {uploadError}
          <button onClick={() => setUploadError(null)} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Expanded panel (grid accordion) ── */}
      <div
        className="overflow-hidden transition-all duration-200"
        style={{
          display: "grid",
          gridTemplateRows: expanded ? "1fr" : "0fr",
        }}
      >
        <div className="min-h-0">
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4">
            {/* Description */}
            {doc.description && (
              <p className="mb-3 text-xs text-slate-500">{doc.description}</p>
            )}

            {/* Waive form */}
            {waiving && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 text-xs font-medium text-amber-800">Waive this document requirement</p>
                <textarea
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="Reason for waiving (optional)…"
                  rows={2}
                  className="mb-2 w-full resize-none rounded border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleWaive}
                    className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    Confirm Waive
                  </button>
                  <button
                    onClick={() => setWaiving(false)}
                    className="rounded border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Files section */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Uploaded Files
              </p>
              {loadingFiles ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading files…
                </div>
              ) : files.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No files uploaded yet — use the Upload button to add a file.
                </p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <FileReviewRow
                      key={file.id}
                      file={file}
                      tracksExpiry={doc.tracks_expiry}
                      caseDocumentId={doc.id}
                      onUpdated={handleFileUpdated}
                      onDeleted={handleFileDeleted}
                    />
                  ))}
                </div>
              )}

              {/* Upload button in expanded section */}
              <div className="mt-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:border-slate-400 hover:bg-white disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploading
                    ? "Uploading…"
                    : files.length > 0 && doc.multiple_files_allowed
                    ? "Upload Another File"
                    : "Upload File"}
                </button>
              </div>
            </div>

            {/* Expiry summary (if tracks_expiry and has files with expiry) */}
            {doc.tracks_expiry && files.some((f) => f.expiry_date) && (
              <div className="mb-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Expiry Tracking
                </p>
                <div className="text-xs text-slate-600">
                  {(() => {
                    const withExpiry = files.filter((f) => f.expiry_date).sort(
                      (a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime()
                    );
                    const nearest = withExpiry[0];
                    if (!nearest) return null;
                    const days = differenceInDays(parseISO(nearest.expiry_date!), new Date());
                    return (
                      <span
                        className={cn(
                          "font-medium",
                          days < 0 ? "text-red-700" : days <= 30 ? "text-red-600" : days <= 90 ? "text-amber-600" : "text-slate-700"
                        )}
                      >
                        Nearest expiry: {fmt(nearest.expiry_date)}{" "}
                        {days < 0
                          ? `(expired ${Math.abs(days)} days ago)`
                          : `(${days} days remaining)`}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CategorySection ───────────────────────────────────────────────────────────

function CategorySection({
  name,
  documents,
  caseId,
  isCollapsed,
  onToggleCollapse,
  onDocUpdated,
  onDocDeleted,
  onRequestForDoc,
}: {
  name: string;
  documents: CaseDocument[];
  caseId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDocUpdated: (id: string, patch: Partial<CaseDocument>) => void;
  onDocDeleted: (id: string) => void;
  onRequestForDoc: (doc: CaseDocument) => void;
}) {
  // Quick stats for header
  const approved = documents.filter((d) => getEffectiveStatus(d) === "approved").length;
  const missing = documents.filter((d) => {
    const s = getEffectiveStatus(d);
    return s === "missing" || s === "requested";
  }).length;

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Category header */}
      <button
        onClick={onToggleCollapse}
        className="flex w-full items-center gap-2 bg-slate-50 px-4 py-2 text-left hover:bg-slate-100"
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200",
            isCollapsed && "-rotate-90"
          )}
        />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          {name}
        </span>
        <span className="text-[10px] text-slate-400">
          {documents.length} doc{documents.length !== 1 ? "s" : ""}
        </span>
        {(approved > 0 || missing > 0) && (
          <div className="flex items-center gap-2 text-[10px]">
            {approved > 0 && (
              <span className="font-medium text-green-600">{approved} approved</span>
            )}
            {missing > 0 && (
              <span className="text-slate-400">{missing} needed</span>
            )}
          </div>
        )}
      </button>

      {/* Rows — accordion */}
      <div
        className="overflow-hidden transition-all duration-200"
        style={{
          display: "grid",
          gridTemplateRows: isCollapsed ? "0fr" : "1fr",
        }}
      >
        <div className="min-h-0">
          {documents.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              caseId={caseId}
              onUpdated={onDocUpdated}
              onDeleted={onDocDeleted}
              onRequestForDoc={onRequestForDoc}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── LoadTemplateModal ─────────────────────────────────────────────────────────

function LoadTemplateModal({
  caseId,
  visaSubclass,
  existingLabels,
  onAdded,
  onClose,
}: {
  caseId: string;
  visaSubclass: string | null;
  existingLabels: Set<string>;
  onAdded: (newDocs: CaseDocument[]) => void;
  onClose: () => void;
}) {
  interface RawDocType {
    id: string;
    label: string;
    is_required: boolean;
    portal_upload: string | null;
    description: string | null;
    category: string | null;
    sort_order: number;
    tracks_expiry: boolean;
    multiple_files_allowed: boolean;
    conditional: boolean;
    internal_only: boolean;
    sponsor_visible: boolean;
    ai_requestable: boolean;
    already_added?: boolean;
  }

  const [allTypes, setAllTypes] = useState<RawDocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visaSubclass) {
      setLoading(false);
      return;
    }
    const url = `/api/document-types?visaSubclass=${visaSubclass}&caseId=${caseId}`;
    fetch(url)
      .then((r) => r.json())
      .then((json: { documentTypes?: RawDocType[] }) => {
        const types = json.documentTypes ?? [];
        setAllTypes(types);
        // Pre-select required and conditional docs that aren't already added
        const preSelected = new Set<string>();
        for (const dt of types) {
          if (!dt.already_added && (dt.is_required || dt.conditional)) {
            preSelected.add(dt.id);
          }
        }
        setSelected(preSelected);
      })
      .catch(() => setError("Failed to load template documents."))
      .finally(() => setLoading(false));
  }, [caseId, visaSubclass]);

  const available = allTypes.filter((dt) => !dt.already_added);
  const grouped = CATEGORY_ORDER.reduce<Record<string, RawDocType[]>>((acc, cat) => {
    const docs = available.filter((dt) => (dt.category ?? "Other") === cat);
    if (docs.length > 0) acc[cat] = docs;
    return acc;
  }, {});
  const uncategorised = available.filter(
    (dt) => !CATEGORY_ORDER.includes(dt.category ?? "Other") && dt.category !== null
  );
  if (uncategorised.length > 0) grouped["Other"] = [...(grouped["Other"] ?? []), ...uncategorised];

  const toggleDoc = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/cases/${caseId}/documents/load-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedIds: Array.from(selected) }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to load documents.");
      setSubmitting(false);
      return;
    }
    const created: CaseDocument[] = (json.created ?? []).map(
      (d: {
        id: string;
        label: string;
        status: string;
        overall_status: string;
        category: string | null;
        sort_order: number;
        portal_upload: string | null;
        tracks_expiry: boolean;
        multiple_files_allowed: boolean;
        document_types?: {
          description: string | null;
          is_required: boolean;
          portal_upload: string | null;
          category: string | null;
          conditional: boolean;
        } | Array<{
          description: string | null;
          is_required: boolean;
          portal_upload: string | null;
          category: string | null;
          conditional: boolean;
        }> | null;
      }) => {
        const dtype = Array.isArray(d.document_types)
          ? d.document_types[0] ?? null
          : d.document_types ?? null;
        return {
          id: d.id,
          label: d.label,
          status: d.status,
          overall_status: d.overall_status ?? "missing",
          file_name: null,
          file_size: null,
          uploaded_at: null,
          review_notes: null,
          storage_path: null,
          is_required: dtype?.is_required ?? true,
          portal_upload: d.portal_upload ?? dtype?.portal_upload ?? null,
          description: dtype?.description ?? null,
          category: d.category ?? dtype?.category ?? null,
          sort_order: d.sort_order ?? 0,
          tracks_expiry: d.tracks_expiry ?? false,
          multiple_files_allowed: d.multiple_files_allowed ?? true,
        };
      }
    );
    onAdded(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Load Standard Documents</h2>
            <p className="text-xs text-slate-400">
              Select documents from the SC-{visaSubclass ?? "?"} template
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : available.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              All template documents for SC-{visaSubclass} have already been added.
            </p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, docs]) => (
                <div key={cat}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {cat}
                  </p>
                  <div className="space-y-1">
                    {docs.map((dt) => (
                      <label
                        key={dt.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(dt.id)}
                          onChange={() => toggleDoc(dt.id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-slate-800"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-slate-800">{dt.label}</span>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                dt.is_required
                                  ? "bg-slate-800 text-white"
                                  : dt.conditional
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-500"
                              )}
                            >
                              {dt.is_required ? "Required" : dt.conditional ? "Conditional" : "Optional"}
                            </span>
                            <PortalBadge portalUpload={dt.portal_upload} />
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && available.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <div className="flex gap-3">
              <button
                onClick={() => setSelected(new Set(available.map((dt) => dt.id)))}
                className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
              >
                Select all
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
              >
                Deselect all
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{selected.size} selected</span>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || selected.size === 0}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add {selected.size > 0 ? `${selected.size} ` : ""}Document{selected.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AddDocumentModal ──────────────────────────────────────────────────────────

function AddDocumentModal({
  caseId,
  visaSubclass,
  existingLabels,
  onAdded,
  onClose,
}: {
  caseId: string;
  visaSubclass: string | null;
  existingLabels: Set<string>;
  onAdded: (doc: CaseDocument) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"template" | "custom">("template");
  const [templateDocs, setTemplateDocs] = useState<DocumentType[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentType | null>(null);

  // Form fields
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [portalUpload, setPortalUpload] = useState<"" | "client" | "sponsor">("");
  const [isRequired, setIsRequired] = useState(true);
  const [tracksExpiry, setTracksExpiry] = useState(false);
  const [multipleFiles, setMultipleFiles] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load template docs
  useEffect(() => {
    if (!visaSubclass || mode !== "template") return;
    setLoadingTemplates(true);
    fetch(`/api/document-types?visaSubclass=${visaSubclass}&caseId=${caseId}`)
      .then((r) => r.json())
      .then((json: { documentTypes?: DocumentType[] }) => {
        setTemplateDocs(json.documentTypes ?? []);
      })
      .catch(() => {/* silently ignore */})
      .finally(() => setLoadingTemplates(false));
  }, [visaSubclass, caseId, mode]);

  const availableTemplates = templateDocs.filter(
    (dt) =>
      !dt.already_added &&
      (templateSearch === "" || dt.label.toLowerCase().includes(templateSearch.toLowerCase()))
  );

  const selectTemplate = (dt: DocumentType) => {
    setSelectedTemplate(dt);
    setLabel(dt.label);
    setDescription(dt.description ?? "");
    setPortalUpload((dt.portal_upload as "" | "client" | "sponsor") ?? "");
    setIsRequired(dt.is_required);
    setTracksExpiry(dt.tracks_expiry);
    setMultipleFiles(dt.multiple_files_allowed);
  };

  const handleSubmit = async () => {
    if (!label.trim()) {
      setError("Document name is required.");
      return;
    }
    if (existingLabels.has(label.trim().toLowerCase())) {
      setError(`A document named "${label.trim()}" already exists in this case.`);
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/documents/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id: caseId,
        label: label.trim(),
        description: description.trim() || undefined,
        portal_upload: portalUpload || null,
        is_required: isRequired,
        tracks_expiry: tracksExpiry,
        multiple_files_allowed: multipleFiles,
        template_document_id: selectedTemplate?.id ?? null,
      }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error ?? "Failed to create document.");
      setSubmitting(false);
      return;
    }

    const newDoc: CaseDocument = {
      id: json.id ?? json.document?.id,
      label: label.trim(),
      status: "pending",
      overall_status: "missing",
      file_name: null,
      file_size: null,
      uploaded_at: null,
      review_notes: null,
      storage_path: null,
      is_required: isRequired,
      portal_upload: portalUpload || null,
      description: description.trim() || null,
      category: selectedTemplate?.category ?? null,
      sort_order: selectedTemplate?.sort_order ?? 999,
      tracks_expiry: tracksExpiry,
      multiple_files_allowed: multipleFiles,
      template_document_id: selectedTemplate?.id ?? null,
    };

    onAdded(newDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Add Document</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setMode("template")}
            className={cn(
              "flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
              mode === "template"
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <BookOpen className="mr-1.5 inline h-4 w-4" />
            From Template
          </button>
          <button
            onClick={() => { setMode("custom"); setSelectedTemplate(null); }}
            className={cn(
              "flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
              mode === "custom"
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Plus className="mr-1.5 inline h-4 w-4" />
            Custom
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {mode === "template" && (
            <div className="mb-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Search template documents…"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {loadingTemplates ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : availableTemplates.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  {templateSearch
                    ? "No matching template documents."
                    : "All template documents already added — switch to Custom to add a new one."}
                </p>
              ) : (
                <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200">
                  {availableTemplates.map((dt) => (
                    <button
                      key={dt.id}
                      onClick={() => selectTemplate(dt)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50",
                        selectedTemplate?.id === dt.id && "bg-slate-100"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">{dt.label}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-medium",
                              dt.is_required ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"
                            )}
                          >
                            {dt.is_required ? "Required" : "Optional"}
                          </span>
                          <PortalBadge portalUpload={dt.portal_upload} />
                          {dt.category && (
                            <span className="text-[10px] text-slate-400">{dt.category}</span>
                          )}
                        </div>
                      </div>
                      {selectedTemplate?.id === dt.id && (
                        <Check className="mt-1 h-4 w-4 shrink-0 text-slate-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fields (shown in both modes once template selected or in custom mode) */}
          {(mode === "custom" || selectedTemplate) && (
            <div className="space-y-3">
              {selectedTemplate && mode === "template" && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Loaded from template. Adjust fields below if needed.
                </p>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Document name <span className="text-red-500">*</span>
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Passport copy"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instructions for the applicant (optional)"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Uploaded by
                </label>
                <select
                  value={portalUpload}
                  onChange={(e) => setPortalUpload(e.target.value as "" | "client" | "sponsor")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="">Agent only</option>
                  <option value="client">Client Portal</option>
                  <option value="sponsor">Sponsor Portal</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                  />
                  Required document
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={tracksExpiry}
                    onChange={(e) => setTracksExpiry(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                  />
                  Track expiry date
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={multipleFiles}
                    onChange={(e) => setMultipleFiles(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                  />
                  Allow multiple files
                </label>
              </div>
            </div>
          )}

          {mode === "template" && !selectedTemplate && availableTemplates.length > 0 && (
            <p className="mt-2 text-center text-xs text-slate-400">
              Select a document above to configure and add it
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !label.trim() || (mode === "template" && !selectedTemplate && availableTemplates.length > 0)}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RequestDocsModal ──────────────────────────────────────────────────────────

type RequestStep = 1 | 2 | 3;

function RequestDocsModal({
  caseId,
  documents,
  preSelectedDoc,
  onClose,
  onRequested,
}: {
  caseId: string;
  documents: CaseDocument[];
  preSelectedDoc: CaseDocument | null;
  onClose: () => void;
  onRequested: (docIds: string[]) => void;
}) {
  const requestable = documents.filter((d) => {
    const s = getEffectiveStatus(d);
    return s === "missing" || s === "rejected" || s === "requested";
  });

  const [step, setStep] = useState<RequestStep>(1);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(
      preSelectedDoc
        ? [preSelectedDoc.id]
        : requestable.map((d) => d.id)
    )
  );
  const [clientMessage, setClientMessage] = useState("");
  const [sponsorMessage, setSponsorMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"client" | "sponsor">("client");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const selectedDocs = requestable.filter((d) => selected.has(d.id));
  const clientDocs = selectedDocs.filter(
    (d) => d.portal_upload === "client" || !d.portal_upload
  );
  const sponsorDocs = selectedDocs.filter((d) => d.portal_upload === "sponsor");
  const hasClient = clientDocs.length > 0;
  const hasSponsor = sponsorDocs.length > 0;

  const toggleDoc = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateMessages = async () => {
    setGenerating(true);
    setGenError(null);
    const res = await fetch(`/api/cases/${caseId}/documents/request-message`, {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setGenError(json.error ?? "Failed to generate message.");
      setGenerating(false);
      return;
    }
    setClientMessage(json.clientMessage ?? "");
    setSponsorMessage(json.sponsorMessage ?? "");
    if (!hasClient && hasSponsor) setActiveTab("sponsor");
    setGenerating(false);
  };

  const handleNextToStep2 = async () => {
    if (selected.size === 0) return;
    setStep(2);
    await generateMessages();
  };

  const handleCopy = async () => {
    const text = activeTab === "client" ? clientMessage : sponsorMessage;
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    setSending(true);
    setSendError(null);

    // Mark selected docs as requested
    const res = await fetch(`/api/cases/${caseId}/documents/mark-requested`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docIds: Array.from(selected),
        requestMessage: activeTab === "client" ? clientMessage : sponsorMessage,
      }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setSendError(json.error ?? "Failed to mark documents as requested.");
      setSending(false);
      return;
    }

    onRequested(Array.from(selected));
    setStep(3);
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Request Missing Documents</h2>
            <div className="mt-1 flex items-center gap-2">
              {([1, 2, 3] as RequestStep[]).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                      step >= s
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-400"
                    )}
                  >
                    {step > s ? <Check className="h-3 w-3" /> : s}
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      step === s ? "font-medium text-slate-700" : "text-slate-400"
                    )}
                  >
                    {s === 1 ? "Select" : s === 2 ? "Message" : "Done"}
                  </span>
                  {s < 3 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 1 — Select documents */}
          {step === 1 && (
            <div>
              {requestable.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No missing or rejected documents to request.
                </p>
              ) : (
                <div className="space-y-4">
                  {hasClient && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Client Documents
                      </p>
                      <div className="space-y-1">
                        {requestable
                          .filter((d) => d.portal_upload === "client" || !d.portal_upload)
                          .map((doc) => (
                            <label
                              key={doc.id}
                              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={selected.has(doc.id)}
                                onChange={() => toggleDoc(doc.id)}
                                className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                              />
                              <span className="flex-1 text-sm text-slate-800">{doc.label}</span>
                              <StatusBadge status={getEffectiveStatus(doc)} />
                            </label>
                          ))}
                      </div>
                    </div>
                  )}

                  {hasSponsor && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Sponsor Documents
                      </p>
                      <div className="space-y-1">
                        {requestable
                          .filter((d) => d.portal_upload === "sponsor")
                          .map((doc) => (
                            <label
                              key={doc.id}
                              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={selected.has(doc.id)}
                                onChange={() => toggleDoc(doc.id)}
                                className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                              />
                              <span className="flex-1 text-sm text-slate-800">{doc.label}</span>
                              <StatusBadge status={getEffectiveStatus(doc)} />
                            </label>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Generate & edit messages */}
          {step === 2 && (
            <div>
              {generating ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Generating AI message…</p>
                </div>
              ) : (
                <div>
                  {genError && (
                    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {genError}
                    </div>
                  )}

                  {/* Tabs */}
                  {hasClient && hasSponsor && (
                    <div className="mb-4 flex rounded-lg border border-slate-200 p-0.5">
                      <button
                        onClick={() => setActiveTab("client")}
                        className={cn(
                          "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                          activeTab === "client"
                            ? "bg-slate-900 text-white"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        Client Message
                      </button>
                      <button
                        onClick={() => setActiveTab("sponsor")}
                        className={cn(
                          "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                          activeTab === "sponsor"
                            ? "bg-slate-900 text-white"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        Sponsor Message
                      </button>
                    </div>
                  )}

                  {/* Document list summary */}
                  <div className="mb-3 rounded-lg bg-slate-50 p-3">
                    <p className="mb-1.5 text-xs font-semibold text-slate-500">
                      Documents referenced in {activeTab} message:
                    </p>
                    <ul className="space-y-0.5">
                      {(activeTab === "client" ? clientDocs : sponsorDocs).map((d) => (
                        <li key={d.id} className="text-xs text-slate-600">
                          • {d.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Editable message */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-700">
                        {activeTab === "client" ? "Client" : "Sponsor"} Message
                      </label>
                      <button
                        onClick={generateMessages}
                        disabled={generating}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                      >
                        <RefreshCw className={cn("h-3 w-3", generating && "animate-spin")} />
                        Regenerate
                      </button>
                    </div>
                    <textarea
                      value={activeTab === "client" ? clientMessage : sponsorMessage}
                      onChange={(e) =>
                        activeTab === "client"
                          ? setClientMessage(e.target.value)
                          : setSponsorMessage(e.target.value)
                      }
                      rows={12}
                      className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  {sendError && (
                    <p className="mt-2 text-xs text-red-600">{sendError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Confirmation */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Documents Marked as Requested</h3>
              <p className="max-w-sm text-sm text-slate-500">
                {selected.size} document{selected.size !== 1 ? "s" : ""}{" "}
                {selected.size !== 1 ? "have" : "has"} been marked as requested.
                Copy the message below and send it to the applicant.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <div className="flex gap-2">
            {step > 1 && step < 3 && (
              <button
                onClick={() => setStep((s) => (s - 1) as RequestStep)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
            )}

            {step === 1 && (
              <>
                <button
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNextToStep2}
                  disabled={selected.size === 0}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            {step === 2 && !generating && (
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Mark as Requested
              </button>
            )}

            {step === 3 && (
              <button
                onClick={onClose}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main: DocumentChecklist ───────────────────────────────────────────────────

export function DocumentChecklist({
  documents: initialDocuments,
  caseId,
  visaSubclass,
}: {
  documents: CaseDocument[];
  caseId: string;
  visaSubclass: string | null;
}) {
  const [documents, setDocuments] = useState<CaseDocument[]>(initialDocuments);
  const [statusFilter, setStatusFilter] = useState("all");
  const [portalFilter, setPortalFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(`doc-collapsed-${caseId}`);
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const [showLoadTemplate, setShowLoadTemplate] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showRequestDocs, setShowRequestDocs] = useState(false);
  const [requestPreSelectedDoc, setRequestPreSelectedDoc] = useState<CaseDocument | null>(null);

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(
        `doc-collapsed-${caseId}`,
        JSON.stringify(Array.from(collapsedCategories))
      );
    } catch {/* ignore */}
  }, [collapsedCategories, caseId]);

  const toggleCategory = useCallback((cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const handleDocUpdated = useCallback((id: string, patch: Partial<CaseDocument>) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  }, []);

  const handleDocDeleted = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleDocsAdded = useCallback((newDocs: CaseDocument[]) => {
    setDocuments((prev) => [...prev, ...newDocs]);
  }, []);

  const handleDocAdded = useCallback((doc: CaseDocument) => {
    setDocuments((prev) => [...prev, doc]);
  }, []);

  const handleRequested = useCallback((docIds: string[]) => {
    const idSet = new Set(docIds);
    setDocuments((prev) =>
      prev.map((d) =>
        idSet.has(d.id) ? { ...d, overall_status: "requested" } : d
      )
    );
  }, []);

  const handleRequestForDoc = useCallback((doc: CaseDocument) => {
    setRequestPreSelectedDoc(doc);
    setShowRequestDocs(true);
  }, []);

  // Filtering
  const filtered = documents.filter((doc) => {
    const s = getEffectiveStatus(doc);
    if (statusFilter !== "all" && s !== statusFilter) return false;
    if (!matchesPortalFilter(doc, portalFilter)) return false;
    if (categoryFilter !== "all" && (doc.category ?? "Other") !== categoryFilter) return false;
    if (search.trim() !== "" && !doc.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group into categories
  const allCategories = Array.from(
    new Set(documents.map((d) => d.category ?? "Other"))
  ).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const groupedFiltered = allCategories.reduce<Record<string, CaseDocument[]>>(
    (acc, cat) => {
      const docs = filtered.filter((d) => (d.category ?? "Other") === cat);
      if (docs.length > 0) acc[cat] = docs;
      return acc;
    },
    {}
  );

  const existingLabels = new Set(documents.map((d) => d.label.toLowerCase()));

  const missingOrRejectedCount = documents.filter((d) => {
    const s = getEffectiveStatus(d);
    return s === "missing" || s === "rejected";
  }).length;

  return (
    <div className="space-y-4 p-6">
      {/* ── Progress summary ── */}
      <ProgressSummary documents={documents} />

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowLoadTemplate(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <BookOpen className="h-4 w-4" />
          Load Standard Docs
        </button>
        <button
          onClick={() => setShowAddDocument(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Add Document
        </button>
        {missingOrRejectedCount > 0 && (
          <button
            onClick={() => { setRequestPreSelectedDoc(null); setShowRequestDocs(true); }}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100"
          >
            <Send className="h-4 w-4" />
            Request Missing Docs
            <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {missingOrRejectedCount}
            </span>
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full rounded-md border border-slate-200 py-1.5 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTER_TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? documents.length
                : documents.filter((d) => getEffectiveStatus(d) === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  statusFilter === tab.key
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                      statusFilter === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Portal tabs + category dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {PORTAL_FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPortalFilter(tab.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  portalFilter === tab.key
                    ? "bg-slate-200 text-slate-800"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {allCategories.length > 1 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="ml-auto rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 focus:border-slate-400 focus:outline-none"
            >
              <option value="all">All categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Document list ── */}
      {documents.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white">
          <div className="text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-200" />
            <p className="mt-2 text-sm text-slate-400">No documents yet.</p>
            <p className="text-xs text-slate-400">
              Click &quot;Load Standard Docs&quot; to add the standard checklist.
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-400">
          No documents match the current filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {Object.entries(groupedFiltered).map(([cat, docs]) => (
            <CategorySection
              key={cat}
              name={cat}
              documents={docs}
              caseId={caseId}
              isCollapsed={collapsedCategories.has(cat)}
              onToggleCollapse={() => toggleCategory(cat)}
              onDocUpdated={handleDocUpdated}
              onDocDeleted={handleDocDeleted}
              onRequestForDoc={handleRequestForDoc}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showLoadTemplate && (
        <LoadTemplateModal
          caseId={caseId}
          visaSubclass={visaSubclass}
          existingLabels={existingLabels}
          onAdded={handleDocsAdded}
          onClose={() => setShowLoadTemplate(false)}
        />
      )}

      {showAddDocument && (
        <AddDocumentModal
          caseId={caseId}
          visaSubclass={visaSubclass}
          existingLabels={existingLabels}
          onAdded={handleDocAdded}
          onClose={() => setShowAddDocument(false)}
        />
      )}

      {showRequestDocs && (
        <RequestDocsModal
          caseId={caseId}
          documents={documents}
          preSelectedDoc={requestPreSelectedDoc}
          onClose={() => { setShowRequestDocs(false); setRequestPreSelectedDoc(null); }}
          onRequested={handleRequested}
        />
      )}
    </div>
  );
}
