"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Mail,
  Phone,
  FileText,
  Bot,
  MessageSquare,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Communication {
  id: string;
  comm_type: string;
  direction: string;
  subject: string | null;
  body: string;
  is_omara_logged: boolean;
  created_at: string;
  author_id: string | null;
  author_name: string | null;
}

interface Props {
  caseId: string;
  initialComms: Communication[];
  currentUserId: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  email:          "Email",
  phone:          "Phone Call",
  note:           "Note",
  system:         "System",
  portal_message: "Portal Message",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  email:          <Mail className="h-4 w-4" />,
  phone:          <Phone className="h-4 w-4" />,
  note:           <FileText className="h-4 w-4" />,
  system:         <Bot className="h-4 w-4" />,
  portal_message: <MessageSquare className="h-4 w-4" />,
};

const TYPE_ICON_BG: Record<string, string> = {
  email:          "bg-blue-50 text-blue-600",
  phone:          "bg-green-50 text-green-600",
  note:           "bg-amber-50 text-amber-600",
  system:         "bg-slate-100 text-slate-500",
  portal_message: "bg-violet-50 text-violet-600",
};

const DIRECTION_STYLES: Record<string, string> = {
  sent:     "bg-blue-50 text-blue-700",
  received: "bg-green-50 text-green-700",
  internal: "bg-slate-100 text-slate-600",
};

// ─── Log Communication Modal ────────────────────────────────────────────────────

function LogCommModal({
  caseId,
  onClose,
  onCreated,
}: {
  caseId: string;
  onClose: () => void;
  onCreated: (comm: Communication) => void;
}) {
  const [commType, setCommType]     = useState("note");
  const [direction, setDirection]   = useState("internal");
  const [subject, setSubject]       = useState("");
  const [body, setBody]             = useState("");
  const [omaraLogged, setOmara]     = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) { setError("Body is required."); return; }
    setSaving(true);
    setError(null);

    const res = await fetch("/api/comms/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id:        caseId,
        comm_type:      commType,
        direction,
        subject:        subject.trim() || null,
        body:           body.trim(),
        is_omara_logged: omaraLogged,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to log communication.");
      setSaving(false);
      return;
    }

    onCreated(json.communication);
    onClose();
  };

  const inputCls =
    "w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Log Communication</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
              <select
                value={commType}
                onChange={(e) => setCommType(e.target.value)}
                className={inputCls}
              >
                <option value="email">Email</option>
                <option value="phone">Phone Call</option>
                <option value="note">Note</option>
                <option value="portal_message">Portal Message</option>
              </select>
            </div>

            {/* Direction */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className={inputCls}
              >
                <option value="sent">Sent</option>
                <option value="received">Received</option>
                <option value="internal">Internal</option>
              </select>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Subject <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Visa grant notification"
              className={inputCls}
            />
          </div>

          {/* Body */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Body *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter communication details…"
              rows={6}
              className={cn(inputCls, "resize-none leading-relaxed")}
              required
            />
          </div>

          {/* OMARA toggle */}
          <div className="flex items-center justify-between border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-700">OMARA Logged</p>
              <p className="text-xs text-slate-400">
                Mark this communication as logged for OMARA compliance
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOmara((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                omaraLogged ? "bg-green-500" : "bg-slate-300"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  omaraLogged ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Log Communication"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Comm Entry Card ────────────────────────────────────────────────────────────

function CommCard({
  comm,
  currentUserId,
  onDelete,
}: {
  comm: Communication;
  currentUserId: string;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete =
    comm.comm_type === "note" && comm.author_id === currentUserId;

  const handleDelete = async () => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/comms/${comm.id}/delete`, { method: "DELETE" });
    if (res.ok) {
      onDelete(comm.id);
    } else {
      alert("Failed to delete note.");
      setDeleting(false);
    }
  };

  const iconBg = TYPE_ICON_BG[comm.comm_type] ?? "bg-slate-100 text-slate-500";
  const icon   = TYPE_ICONS[comm.comm_type] ?? <FileText className="h-4 w-4" />;

  // Determine if body needs truncation (rough heuristic: > 200 chars or > 3 lines)
  const isLong = comm.body.length > 200 || comm.body.split("\n").length > 3;

  return (
    <div className="bg-white border border-slate-200 overflow-hidden">
      {/* Header row */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Icon */}
        <div className={cn("mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full", iconBg)}>
          {icon}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* Type label */}
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              {TYPE_LABELS[comm.comm_type] ?? comm.comm_type}
            </span>

            {/* Direction badge */}
            {comm.direction && (
              <span className={cn(
                "inline-block px-2 py-0.5 text-xs font-medium capitalize",
                DIRECTION_STYLES[comm.direction] ?? "bg-slate-100 text-slate-600"
              )}>
                {comm.direction}
              </span>
            )}

            {/* OMARA badge */}
            {comm.is_omara_logged && (
              <span className="inline-block rounded-sm bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                OMARA
              </span>
            )}
          </div>

          {/* Meta: author + time */}
          <p className="text-xs text-slate-400">
            {comm.author_name ?? "Unknown"} &middot;{" "}
            {format(parseISO(comm.created_at), "d MMM yyyy, h:mm a")}
          </p>
        </div>

        {/* Delete button (notes by author only) */}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-2 flex-shrink-0 p-1 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
            title="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="border-t border-slate-100 px-4 py-3">
        {/* Subject */}
        {comm.subject && (
          <p className="mb-1.5 text-sm font-semibold text-slate-800">{comm.subject}</p>
        )}

        {/* Body text */}
        <div
          className={cn(
            "text-sm text-slate-600 whitespace-pre-wrap leading-relaxed",
            !expanded && isLong && "line-clamp-3"
          )}
        >
          {comm.body}
        </div>

        {/* Expand toggle */}
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Show more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main CommsLog Component ────────────────────────────────────────────────────

export function CommsLog({ caseId, initialComms, currentUserId }: Props) {
  const [comms, setComms]             = useState<Communication[]>(initialComms);
  const [modalOpen, setModalOpen]     = useState(false);
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState("");
  const [dirFilter, setDirFilter]     = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return comms.filter((c) => {
      if (typeFilter && c.comm_type !== typeFilter) return false;
      if (dirFilter && c.direction !== dirFilter) return false;
      if (
        q &&
        !c.body.toLowerCase().includes(q) &&
        !(c.subject ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [comms, search, typeFilter, dirFilter]);

  const handleCreated = (comm: Communication) => {
    setComms((prev) => [comm, ...prev]);
  };

  const handleDelete = (id: string) => {
    setComms((prev) => prev.filter((c) => c.id !== id));
  };

  const selectCls =
    "border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border border-slate-200 bg-white px-4 py-3">
          {/* Search */}
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject or body…"
              className="w-full border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">All types</option>
            <option value="email">Email</option>
            <option value="phone">Phone Call</option>
            <option value="note">Note</option>
            <option value="system">System</option>
            <option value="portal_message">Portal Message</option>
          </select>

          {/* Direction filter */}
          <select
            value={dirFilter}
            onChange={(e) => setDirFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">All directions</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
            <option value="internal">Internal</option>
          </select>

          <button
            onClick={() => setModalOpen(true)}
            className="ml-auto flex items-center gap-1.5 bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Log Communication
          </button>
        </div>

        {/* Feed */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 bg-white py-16 text-slate-400">
            <MessageSquare className="h-7 w-7" />
            <p className="text-sm">
              {comms.length === 0
                ? "No communications logged yet."
                : "No communications match your filters."}
            </p>
            {comms.length === 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-2 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800"
              >
                Log the first one
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((comm) => (
              <CommCard
                key={comm.id}
                comm={comm}
                currentUserId={currentUserId}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Count summary */}
        {filtered.length > 0 && (
          <p className="text-right text-xs text-slate-400">
            {filtered.length} of {comms.length} communication
            {comms.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {modalOpen && (
        <LogCommModal
          caseId={caseId}
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
