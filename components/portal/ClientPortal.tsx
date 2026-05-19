"use client";

import { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  Circle,
  Clock,
  Upload,
  FileText,
  AlertCircle,
  CheckCheck,
  XCircle,
  Send,
  ChevronDown,
  ChevronUp,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientPortalData, PortalDocument, PortalMessage, PortalStage } from "@/lib/supabase/portal";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | null) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "dd/MM/yyyy"); } catch { return iso; }
}

function fmtTime(iso: string) {
  try { return format(parseISO(iso), "d MMM yyyy, h:mm a"); } catch { return iso; }
}

function maskPassport(num: string | null) {
  if (!num) return "—";
  if (num.length <= 4) return "•".repeat(num.length);
  return num.slice(0, 2) + "•".repeat(num.length - 4) + num.slice(-2);
}

// ── Status progress bar ───────────────────────────────────────────────────────

function StageProgress({ stages }: { stages: PortalStage[] }) {
  if (!stages.length) return null;

  const completedCount = stages.filter((s) => s.is_complete).length;
  const currentIdx = stages.findIndex((s) => s.is_current);
  const displayIdx = currentIdx >= 0 ? currentIdx : completedCount;
  const pct = stages.length > 1 ? (displayIdx / (stages.length - 1)) * 100 : 100;

  return (
    <div>
      {/* Bar */}
      <div className="relative mb-4 h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-[#0f172a] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Dots */}
      <div className="flex items-start justify-between gap-1">
        {stages.map((s, i) => {
          const done = s.is_complete;
          const current = s.is_current || (!s.is_current && i === displayIdx && !done);
          return (
            <div key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  done
                    ? "border-[#0f172a] bg-[#0f172a]"
                    : current
                    ? "border-[#0f172a] bg-white"
                    : "border-slate-200 bg-white"
                )}
              >
                {done ? (
                  <CheckCheck className="h-2.5 w-2.5 text-white" />
                ) : current ? (
                  <div className="h-2 w-2 rounded-full bg-[#0f172a]" />
                ) : null}
              </div>
              <span
                className={cn(
                  "hidden text-center text-[10px] leading-tight sm:block",
                  done || current ? "font-medium text-slate-700" : "text-slate-400"
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Document row ─────────────────────────────────────────────────────────────

function DocRow({
  doc,
  token,
  onUpdated,
}: {
  doc: PortalDocument;
  token: string;
  onUpdated: (updated: PortalDocument) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(
      `/api/portal/client/${token}/documents/${doc.id}/upload`,
      { method: "POST", body: fd }
    );
    const json = await res.json().catch(() => ({}));

    if (res.ok && json.document) {
      onUpdated({ ...doc, ...json.document });
    } else {
      setError(json.error ?? "Upload failed. Please try again.");
    }
    setUploading(false);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const statusBadge = () => {
    switch (doc.status) {
      case "approved":
        return (
          <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </span>
        );
      case "uploaded":
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            <Clock className="h-3 w-3" />
            Under review
          </span>
        );
      case "rejected":
        return (
          <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            <Circle className="h-3 w-3" />
            Required
          </span>
        );
    }
  };

  const canUpload = doc.status === "pending" || doc.status === "rejected";

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <FileText className="h-4 w-4 shrink-0 text-slate-300" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-800">{doc.label}</span>
            {!doc.is_required && (
              <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                Optional
              </span>
            )}
          </div>
          {doc.file_name && (
            <p className="mt-0.5 text-xs text-slate-400">
              {doc.file_name}
              {doc.uploaded_at && <> · Uploaded {fmt(doc.uploaded_at)}</>}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {statusBadge()}
          {canUpload && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                <Upload className="h-3 w-3" />
                {uploading ? "Uploading…" : doc.status === "rejected" ? "Re-upload" : "Upload"}
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
            </>
          )}
          {doc.status === "rejected" && doc.review_notes && (
            <button onClick={() => setExpanded((e) => !e)} className="text-slate-400 hover:text-slate-600">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Rejection notes */}
      {doc.status === "rejected" && doc.review_notes && expanded && (
        <div className="mx-4 mb-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span className="font-medium">Reason: </span>{doc.review_notes}
        </div>
      )}

      {error && (
        <div className="mx-4 mb-3 flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

// ── Messages section ──────────────────────────────────────────────────────────

function Messages({
  initialMessages,
  token,
  portalType,
}: {
  initialMessages: PortalMessage[];
  token: string;
  portalType: "client" | "sponsor";
}) {
  const [messages, setMessages] = useState<PortalMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    if (!draft.trim()) return;
    setSending(true);
    setError(null);

    const res = await fetch(`/api/portal/${portalType}/${token}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.trim() }),
    });
    const json = await res.json().catch(() => ({}));

    if (res.ok && json.message) {
      setMessages((prev) => [...prev, json.message]);
      setDraft("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } else {
      setError(json.error ?? "Failed to send message.");
    }
    setSending(false);
  };

  return (
    <div>
      {/* Message list */}
      {messages.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No messages yet. Send a message below to contact your agent.
        </p>
      ) : (
        <div className="mb-4 space-y-3">
          {messages.map((m) => {
            const isAgent = m.direction === "sent";
            return (
              <div
                key={m.id}
                className={cn("flex", isAgent ? "justify-start" : "justify-end")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-sm px-4 py-2.5 text-sm",
                    isAgent
                      ? "bg-slate-100 text-slate-800"
                      : "bg-[#0f172a] text-white"
                  )}
                >
                  {isAgent && m.author_name && (
                    <p className="mb-1 text-xs font-medium text-slate-500">{m.author_name}</p>
                  )}
                  <p className="leading-relaxed">{m.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-right text-[10px]",
                      isAgent ? "text-slate-400" : "text-slate-300"
                    )}
                  >
                    {fmtTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Compose */}
      {error && (
        <div className="mb-2 flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
          placeholder="Type a message to your agent…"
          rows={3}
          className="flex-1 resize-none border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <button
          onClick={send}
          disabled={sending || !draft.trim()}
          className="flex shrink-0 flex-col items-center justify-center gap-1 border border-[#0f172a] bg-[#0f172a] px-4 text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          <span className="text-[10px]">Send</span>
        </button>
      </div>
      <p className="mt-1 text-right text-[10px] text-slate-400">⌘ Enter to send</p>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ClientPortal({ data }: { data: ClientPortalData }) {
  const { entity, caseData, stages, firm } = data;
  const [documents, setDocuments] = useState<PortalDocument[]>(data.documents);

  const currentStage = stages.find((s) => s.is_current);
  const completedCount = stages.filter((s) => s.is_complete).length;

  const updateDoc = (updated: PortalDocument) =>
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-5">
          {/* Firm branding */}
          <div className="mb-4 flex items-center gap-3">
            {firm.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={firm.logo_url} alt={firm.name} className="h-8 w-auto object-contain" />
            ) : (
              <span className="text-sm font-semibold text-[#0f172a]">{firm.name}</span>
            )}
          </div>

          {/* Title block */}
          <h1 className="text-2xl font-bold text-[#0f172a]">Your Visa Application</h1>
          <p className="mt-1 text-sm text-slate-500">
            {entity.full_name} &nbsp;·&nbsp; SC-{caseData.visa_subclass}
            {caseData.visa_stream ? ` · ${caseData.visa_stream}` : ""}
          </p>

          {/* Ref + status badges */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {caseData.ref_number && (
              <span className="rounded-sm bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-600">
                {caseData.ref_number}
              </span>
            )}
            {currentStage && (
              <span className="rounded-sm bg-[#0f172a] px-2.5 py-0.5 text-xs font-medium text-white">
                {currentStage.label}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">

        {/* Section 1 — Status */}
        <Section title="Application Status">
          {caseData.status === "granted" ? (
            <div className="rounded-sm border border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">Congratulations — Visa Granted!</p>
                  <p className="mt-1 text-sm text-green-700">
                    Your SC-{caseData.visa_subclass} visa has been granted.
                    {caseData.visa_expiry && (
                      <> Your visa is valid until <strong>{fmt(caseData.visa_expiry)}</strong>.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {stages.length > 0 ? (
                <>
                  <p className="mb-4 text-sm text-slate-600">
                    Your application is currently in the{" "}
                    <strong>{currentStage?.label ?? "initial"}</strong> stage.
                    {stages.length > 0 && (
                      <> {completedCount} of {stages.length} stages complete.</>
                    )}
                  </p>
                  <StageProgress stages={stages} />
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  Your application is <span className="capitalize font-medium">{caseData.status}</span>.
                  Contact your agent for more information.
                </p>
              )}
            </>
          )}
        </Section>

        {/* Section 2 — Documents */}
        <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Document Checklist
            </h2>
          </div>
          {documents.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              No documents have been requested yet.
            </p>
          ) : (
            <div>
              {documents.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  token={entity.portal_token}
                  onUpdated={updateDoc}
                />
              ))}
            </div>
          )}
        </section>

        {/* Section 3 — Messages */}
        <Section title="Messages">
          <Messages
            initialMessages={data.messages}
            token={entity.portal_token}
            portalType="client"
          />
        </Section>

        {/* Section 4 — Your Details */}
        <Section title="Your Details">
          <div className="space-y-3">
            <DetailRow label="Full Name" value={entity.full_name} />
            <DetailRow label="Nationality" value={entity.nationality} />
            <DetailRow label="Passport Number" value={maskPassport(entity.passport_number)} />
            <DetailRow label="Passport Expiry" value={fmt(entity.passport_expiry)} />
          </div>
          <p className="mt-4 text-xs text-slate-400">
            To update your personal details, contact your migration agent.
          </p>
        </Section>

        {/* Footer */}
        <footer className="py-4 text-center text-xs text-slate-400">
          {firm.name}
          {firm.phone && <> · {firm.phone}</>}
          {firm.email && <> · <a href={`mailto:${firm.email}`} className="hover:underline">{firm.email}</a></>}
        </footer>
      </main>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-50 pb-3 last:border-0">
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-sm text-slate-800">{value ?? "—"}</span>
    </div>
  );
}
