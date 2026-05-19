"use client";

import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ChevronDown,
  CheckCheck,
  Pencil,
  Plus,
  X,
  Loader2,
  AlertCircle,
  GitBranch,
  User,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────

export interface CaseDetailData {
  id: string;
  ref_number: string | null;
  visa_subclass: string;
  visa_stream: string | null;
  status: string;
  lodgement_date: string | null;
  trn: string | null;
  grant_date: string | null;
  visa_expiry: string | null;
  notes: string | null;
  current_stage_label: string | null;
  clients: {
    full_name: string;
    email: string | null;
    phone: string | null;
    nationality: string | null;
    passport_number: string | null;
    passport_expiry: string | null;
  } | null;
  sponsor: {
    company_name: string;
    contact_name: string | null;
    contact_email: string | null;
  } | null;
  agent: { full_name: string; email: string | null } | null;
}

// ── Constants ─────────────────────────────────────────────────

// STATUSES kept for reference — dropdown uses explicit lists per section
// const STATUSES = ["active", "submitted", "granted", "refused", "withdrawn"] as const;

const STATUS_STYLES: Record<string, { badge: string }> = {
  active:    { badge: "bg-blue-50 text-blue-700 border-blue-200" },
  submitted: { badge: "bg-amber-50 text-amber-700 border-amber-200" },
  granted:   { badge: "bg-green-50 text-green-700 border-green-200" },
  refused:   { badge: "bg-red-50 text-red-700 border-red-200" },
  withdrawn: { badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

const DEADLINE_TYPES = [
  { value: "dha",      label: "DHA / Department" },
  { value: "document", label: "Document" },
  { value: "client",   label: "Client" },
  { value: "internal", label: "Internal" },
];

function fmtDate(iso: string | null) {
  if (!iso) return null;
  try { return format(parseISO(iso), "dd/MM/yyyy"); } catch { return iso; }
}

// ── Sub-components ────────────────────────────────────────────

function InlineField({
  label,
  value,
  type = "text",
  onSave,
}: {
  label: string;
  value: string | null;
  type?: "text" | "date";
  onSave: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim() || null;
    if (trimmed !== value) onSave(trimmed);
  };

  const display = type === "date" ? fmtDate(value) : value;

  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      {editing ? (
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          className="border-b border-slate-400 bg-transparent pb-0.5 text-sm text-slate-900 focus:border-[#0f172a] focus:outline-none"
        />
      ) : (
        <button
          onClick={() => { setDraft(value ?? ""); setEditing(true); }}
          className="group flex items-center gap-1.5 text-sm text-slate-800 hover:text-slate-900"
        >
          <span>{display ?? <span className="text-slate-400">—</span>}</span>
          <Pencil className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
}

function StatusDropdown({
  caseId,
  status,
  onStatusChange,
}: {
  caseId: string;
  status: string;
  onStatusChange: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const change = async (newStatus: string) => {
    setOpen(false);
    if (newStatus === status) return;
    setSaving(true);
    onStatusChange(newStatus);
    await fetch(`/api/cases/${caseId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
  };

  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.active;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 border px-3 py-1.5 text-sm font-semibold capitalize transition-colors shadow-sm",
          styles.badge,
          "hover:opacity-90 active:scale-95"
        )}
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {status}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-52 border border-slate-200 bg-white shadow-xl overflow-hidden">

          {/* ── DHA Decision ─────────────────────────────────── */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              DHA Decision
            </p>
          </div>

          <button
            onClick={() => change("granted")}
            disabled={status === "granted"}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 transition-colors",
              status === "granted" ? "opacity-40 cursor-default" : "cursor-pointer"
            )}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
            Mark Granted
            {status === "granted" && <span className="ml-auto text-xs font-normal text-slate-400">current</span>}
          </button>

          <button
            onClick={() => change("refused")}
            disabled={status === "refused"}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors",
              status === "refused" ? "opacity-40 cursor-default" : "cursor-pointer"
            )}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
            Mark Refused
            {status === "refused" && <span className="ml-auto text-xs font-normal text-slate-400">current</span>}
          </button>

          {/* ── Case Status ───────────────────────────────────── */}
          <div className="bg-slate-50 border-y border-slate-200 px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Case Status
            </p>
          </div>

          {(["active", "submitted", "withdrawn"] as const).map((s) => {
            const dotColor =
              s === "active"    ? "bg-blue-500" :
              s === "submitted" ? "bg-amber-500" :
                                  "bg-slate-400";
            const isActive = s === status;
            return (
              <button
                key={s}
                onClick={() => change(s)}
                disabled={isActive}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium capitalize text-slate-800 hover:bg-slate-50 transition-colors",
                  isActive ? "opacity-50 cursor-default" : "cursor-pointer"
                )}
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} />
                {s}
                {isActive && <span className="ml-auto text-xs font-normal text-slate-400">current</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Send Portal Invite Modal ──────────────────────────────────

function SendPortalInviteModal({
  caseData,
  onClose,
}: {
  caseData: CaseDetailData;
  onClose: () => void;
}) {
  const [portalType, setPortalType] = useState<"client" | "sponsor">("client");
  const [loading, setLoading] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasClient  = !!caseData.clients;
  const hasSponsor = !!caseData.sponsor;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setPortalUrl(null);
    setCopied(false);

    const res = await fetch("/api/portal/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: caseData.id, portalType }),
    });
    const json = await res.json().catch(() => ({}));

    if (res.ok && json.portalUrl) {
      setPortalUrl(json.portalUrl);
    } else {
      setError(json.error ?? "Failed to generate portal link.");
    }
    setLoading(false);
  };

  const copy = async () => {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Send Portal Invite</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {error && (
            <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Portal type selector */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-700">Which portal?</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setPortalType("client"); setPortalUrl(null); }}
                disabled={!hasClient}
                className={cn(
                  "flex-1 border px-4 py-2.5 text-sm font-medium transition-colors",
                  portalType === "client"
                    ? "border-[#0f172a] bg-[#0f172a] text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                  !hasClient && "cursor-not-allowed opacity-40"
                )}
              >
                <User className="mx-auto mb-1 h-4 w-4" />
                Client Portal
              </button>
              <button
                onClick={() => { setPortalType("sponsor"); setPortalUrl(null); }}
                disabled={!hasSponsor}
                className={cn(
                  "flex-1 border px-4 py-2.5 text-sm font-medium transition-colors",
                  portalType === "sponsor"
                    ? "border-[#0f172a] bg-[#0f172a] text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                  !hasSponsor && "cursor-not-allowed opacity-40"
                )}
              >
                <Link2 className="mx-auto mb-1 h-4 w-4" />
                Sponsor Portal
              </button>
            </div>
            {!hasClient && portalType === "client" && (
              <p className="mt-1.5 text-xs text-amber-600">No client linked to this case.</p>
            )}
            {!hasSponsor && portalType === "sponsor" && (
              <p className="mt-1.5 text-xs text-amber-600">No sponsor linked to this case.</p>
            )}
          </div>

          {/* Generated URL */}
          {portalUrl && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-700">Portal link</p>
              <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">
                  {portalUrl}
                </span>
                <button
                  onClick={copy}
                  className="shrink-0 text-slate-400 hover:text-slate-700"
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {copied ? "Copied!" : "Copy and share this link with your client."}{" "}
                Keep it private — anyone with this link can access the portal.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-800"
          >
            Close
          </button>
          <button
            onClick={generate}
            disabled={loading || (portalType === "client" && !hasClient) || (portalType === "sponsor" && !hasSponsor)}
            className="flex items-center gap-2 bg-[#0f172a] px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {portalUrl ? "Regenerate Link" : "Generate Link"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionsDropdown({
  onAddDeadline,
  onPortalInvite,
}: {
  onAddDeadline: () => void;
  onPortalInvite: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        Actions
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 border border-slate-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => { setOpen(false); onAddDeadline(); }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4 text-slate-400" />
            Add Deadline
          </button>
          <button
            onClick={() => { setOpen(false); onPortalInvite(); }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Link2 className="h-4 w-4 text-slate-400" />
            Send Portal Invite
          </button>
        </div>
      )}
    </div>
  );
}

function AddDeadlineModal({
  caseId,
  onClose,
  onSuccess,
}: {
  caseId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [label, setLabel] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineType, setDeadlineType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const submit = async () => {
    if (!label.trim() || !deadlineDate) {
      setError("Label and date are required.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/deadlines/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId,
        label: label.trim(),
        deadline_date: deadlineDate,
        deadline_type: deadlineType || null,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      setError(data.error ?? "Failed to create deadline.");
      setSubmitting(false);
      return;
    }
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Add Deadline</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Health assessment due"
              autoFocus
              className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Type
            </label>
            <div className="relative">
              <select
                value={deadlineType}
                onChange={(e) => setDeadlineType(e.target.value)}
                className="w-full appearance-none border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                <option value="">— Optional —</option>
                {DEADLINE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex items-center gap-2 bg-[#0f172a] px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add Deadline
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export function CaseHeader({ caseData }: { caseData: CaseDetailData }) {
  const [status, setStatus] = useState(caseData.status);
  const [fields, setFields] = useState({
    lodgement_date: caseData.lodgement_date,
    trn: caseData.trn,
    grant_date: caseData.grant_date,
    visa_expiry: caseData.visa_expiry,
  });
  const [addDeadlineOpen, setAddDeadlineOpen] = useState(false);
  const [portalInviteOpen, setPortalInviteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const saveField = async (
    key: keyof typeof fields,
    value: string | null
  ) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    await fetch(`/api/cases/${caseData.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
  };

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        {/* Row 1: ref, badges, actions */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-bold text-slate-900">
              {caseData.ref_number ?? "—"}
            </h1>

            {/* Visa subclass */}
            <span className="bg-[#0f172a] px-2.5 py-0.5 text-xs font-semibold text-white">
              SC-{caseData.visa_subclass}
              {caseData.visa_stream ? ` · ${caseData.visa_stream}` : ""}
            </span>

            {/* Status */}
            <StatusDropdown
              caseId={caseData.id}
              status={status}
              onStatusChange={setStatus}
            />
          </div>

          <ActionsDropdown
            onAddDeadline={() => setAddDeadlineOpen(true)}
            onPortalInvite={() => setPortalInviteOpen(true)}
          />
        </div>

        {/* Row 2: client info + stage + agent */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <div>
            <span className="text-base font-semibold text-slate-800">
              {caseData.clients?.full_name ?? "No client"}
            </span>
            {caseData.clients?.nationality && (
              <span className="ml-2 text-sm text-slate-400">
                · {caseData.clients.nationality}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            {caseData.current_stage_label && (
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                {caseData.current_stage_label}
              </span>
            )}
            {caseData.agent?.full_name && (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {caseData.agent.full_name}
              </span>
            )}
          </div>
        </div>

        {/* Row 3: details strip */}
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-100 pt-4">
          <InlineField
            label="Lodgement Date"
            value={fields.lodgement_date}
            type="date"
            onSave={(v) => saveField("lodgement_date", v)}
          />
          <InlineField
            label="TRN"
            value={fields.trn}
            onSave={(v) => saveField("trn", v)}
          />
          <InlineField
            label="Grant Date"
            value={fields.grant_date}
            type="date"
            onSave={(v) => saveField("grant_date", v)}
          />
          <InlineField
            label="Visa Expiry"
            value={fields.visa_expiry}
            type="date"
            onSave={(v) => saveField("visa_expiry", v)}
          />
        </div>
      </div>

      {addDeadlineOpen && (
        <AddDeadlineModal
          caseId={caseData.id}
          onClose={() => setAddDeadlineOpen(false)}
          onSuccess={() => showToast("Deadline added successfully.")}
        />
      )}

      {portalInviteOpen && (
        <SendPortalInviteModal
          caseData={caseData}
          onClose={() => setPortalInviteOpen(false)}
        />
      )}

      {/* Success toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <CheckCheck className="h-4 w-4 text-green-400" />
          {toast}
        </div>
      )}
    </>
  );
}
