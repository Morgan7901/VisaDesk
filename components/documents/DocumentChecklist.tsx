"use client";

import { useState } from "react";
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
  RefreshCw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FileUploader } from "./FileUploader";

export interface CaseDocument {
  id: string;
  label: string;
  status: string;
  file_name: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  review_notes: string | null;
  storage_path: string | null;
  is_required: boolean;
  portal_upload: string | null;
  description: string | null;
}

interface Props {
  documents: CaseDocument[];
  caseId: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  pending: {
    label: "Pending",
    icon: <Clock className="h-3.5 w-3.5" />,
    className: "bg-slate-100 text-slate-600",
  },
  uploaded: {
    label: "Under Review",
    icon: <Eye className="h-3.5 w-3.5" />,
    className: "bg-amber-100 text-amber-700",
  },
  approved: {
    label: "Approved",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: "bg-emerald-100 text-emerald-700",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: "bg-red-100 text-red-700",
  },
};

function PortalPill({ portalUpload }: { portalUpload: string | null }) {
  if (!portalUpload) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        Agent
      </span>
    );
  }
  if (portalUpload === "client") {
    return (
      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
        Client Portal
      </span>
    );
  }
  return (
    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
      Sponsor Portal
    </span>
  );
}

const SECTION_ORDER = ["pending", "uploaded", "approved", "rejected"];
const SECTION_LABELS: Record<string, string> = {
  pending: "Pending",
  uploaded: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
};

export function DocumentChecklist({ documents, caseId }: Props) {
  const router = useRouter();

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Review modal
  const [reviewDoc, setReviewDoc] = useState<CaseDocument | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected">(
    "approved"
  );
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

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/documents/${id}/delete`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (res.ok) router.refresh();
  }

  async function handleDownload(doc: CaseDocument) {
    setDownloadingId(doc.id);
    const res = await fetch(`/api/documents/${doc.id}/download`);
    if (res.ok) {
      const { signedUrl } = await res.json();
      window.open(signedUrl, "_blank");
    }
    setDownloadingId(null);
  }

  function openReview(doc: CaseDocument) {
    setReviewDoc(doc);
    setReviewStatus("approved");
    setReviewNotes("");
    setReviewError(null);
  }

  async function submitReview() {
    if (!reviewDoc) return;
    setSubmittingReview(true);
    setReviewError(null);

    const res = await fetch(`/api/documents/${reviewDoc.id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: reviewStatus, review_notes: reviewNotes }),
    });

    if (!res.ok) {
      const data = await res.json();
      setReviewError(data.error ?? "Failed to submit review.");
      setSubmittingReview(false);
      return;
    }

    setSubmittingReview(false);
    setReviewDoc(null);
    router.refresh();
  }

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

  const grouped = SECTION_ORDER.map((status) => ({
    status,
    label: SECTION_LABELS[status],
    docs: documents.filter((d) => d.status === status),
  })).filter((g) => g.docs.length > 0);

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Documents
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {documents.filter((d) => d.status === "approved").length} /{" "}
            {documents.length} approved
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
          Add Document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
          <div className="text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">No documents yet.</p>
            <p className="text-xs text-slate-400">
              Add a document or run migrations with seed data.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ status, label, docs }) => (
            <div key={status}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                    STATUS_CONFIG[status]?.className
                  )}
                >
                  {STATUS_CONFIG[status]?.icon}
                  {label}
                </span>
                <span className="text-xs text-slate-400">
                  {docs.length} document{docs.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                {docs.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className={cn(
                      "px-4 py-3",
                      idx < docs.length - 1 && "border-b border-slate-100"
                    )}
                  >
                    {/* Upload widget (inline, replaces row when active) */}
                    {uploadingId === doc.id ? (
                      <FileUploader
                        documentId={doc.id}
                        onSuccess={() => {
                          setUploadingId(null);
                          router.refresh();
                        }}
                        onCancel={() => setUploadingId(null)}
                      />
                    ) : (
                      <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
                        {/* Label + meta */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">
                              {doc.label}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                doc.is_required
                                  ? "bg-red-50 text-red-600"
                                  : "bg-slate-100 text-slate-500"
                              )}
                            >
                              {doc.is_required ? "Required" : "Optional"}
                            </span>
                            <PortalPill portalUpload={doc.portal_upload} />
                          </div>

                          {doc.description && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {doc.description}
                            </p>
                          )}

                          {doc.file_name && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{doc.file_name}</span>
                              {doc.file_size && (
                                <span className="shrink-0 text-slate-400">
                                  ({formatBytes(doc.file_size)})
                                </span>
                              )}
                              {doc.uploaded_at && (
                                <span className="shrink-0 text-slate-400">
                                  · {formatDate(doc.uploaded_at)}
                                </span>
                              )}
                            </div>
                          )}

                          {status === "rejected" && doc.review_notes && (
                            <p className="mt-1 text-xs text-red-600">
                              <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
                              {doc.review_notes}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-2">
                          {status === "pending" && doc.portal_upload === null && (
                            <button
                              type="button"
                              onClick={() => setUploadingId(doc.id)}
                              className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Upload
                            </button>
                          )}

                          {status === "uploaded" && (
                            <button
                              type="button"
                              onClick={() => openReview(doc)}
                              className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Review
                            </button>
                          )}

                          {status === "approved" && (
                            <button
                              type="button"
                              onClick={() => handleDownload(doc)}
                              disabled={downloadingId === doc.id}
                              className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {downloadingId === doc.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              Download
                            </button>
                          )}

                          {status === "rejected" && (
                            <button
                              type="button"
                              onClick={() => setUploadingId(doc.id)}
                              className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Re-upload
                            </button>
                          )}

                          {/* Remove / inline confirm */}
                          {confirmDeleteId === doc.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Remove?</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(doc.id)}
                                disabled={deletingId === doc.id}
                                className="flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                {deletingId === doc.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : null}
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={deletingId === doc.id}
                                className="rounded-md px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(doc.id)}
                              className="rounded-md p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Remove document"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {reviewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReviewDoc(null);
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-800">
              Review Document
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">{reviewDoc.label}</p>

            {reviewDoc.file_name && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{reviewDoc.file_name}</span>
                <button
                  type="button"
                  onClick={() => handleDownload(reviewDoc)}
                  className="ml-auto shrink-0 text-slate-400 hover:text-slate-600"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            )}

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
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Review notes{reviewStatus === "rejected" && (
                  <span className="text-red-500"> *</span>
                )}
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  reviewStatus === "rejected"
                    ? "Reason for rejection..."
                    : "Optional notes..."
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none resize-none"
              />
            </div>

            {reviewError && (
              <p className="mt-2 text-xs text-red-600">{reviewError}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewDoc(null)}
                disabled={submittingReview}
                className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReview}
                disabled={submittingReview}
                className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {submittingReview && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-800">
              Add Document
            </h3>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Document name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  placeholder="e.g. Employment contract"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Optional guidance..."
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Uploaded by
                </label>
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
                <input
                  type="checkbox"
                  checked={addRequired}
                  onChange={(e) => setAddRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#0f172a]"
                />
                <span className="text-sm text-slate-700">Required document</span>
              </label>
            </div>

            {addError && (
              <p className="mt-3 text-xs text-red-600">{addError}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={submittingAdd}
                className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAdd}
                disabled={!addLabel.trim() || submittingAdd}
                className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittingAdd && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Add Document
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
