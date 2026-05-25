"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, MinusCircle,
  ChevronDown, ChevronRight, Send, FileText, Zap, Calendar,
  User, Globe, Activity,
  MessageSquare, Plus, Loader2, Info,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SC500OverviewProps {
  caseId: string;
  refNumber: string | null;
  status: string;
  lodgementDate: string | null;
  grantDate: string | null;
  visaExpiry: string | null;
  currentStageLabel: string | null;
  trn: string | null;
  clientName: string | null;
  clientNationality: string | null;
  clientPassportExpiry: string | null;
  agentName: string | null;
  fieldValues: Record<string, unknown>;
  hasDocuments: boolean;
  aiDocCount: number;
}

interface ActivityItem {
  id: string;
  type: "note" | "email" | "communication" | "stage_completed" | "document_uploaded" | "ai_document" | "deadline";
  title: string;
  body?: string | null;
  author?: string | null;
  created_at: string;
  meta?: Record<string, unknown>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ENGLISH_EXEMPT_NATIONALITIES = [
  "Australia", "United Kingdom", "United States", "Canada",
  "New Zealand", "Ireland", "South Africa",
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-blue-100 text-blue-700",
  lodged: "bg-amber-100 text-amber-700",
  granted: "bg-emerald-100 text-emerald-700",
  refused: "bg-red-100 text-red-700",
  closed: "bg-slate-100 text-slate-500",
  withdrawn: "bg-slate-100 text-slate-500",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fv(fieldValues: Record<string, unknown>, key: string): string {
  const v = fieldValues[key];
  if (v === null || v === undefined) return "";
  return String(v);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function daysFromNow(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function dateColor(iso: string | null | undefined): string {
  const days = daysFromNow(iso);
  if (days === null) return "text-slate-400";
  if (days < 0) return "text-red-600 font-semibold";
  if (days < 14) return "text-red-600 font-semibold";
  if (days < 60) return "text-amber-600 font-medium";
  return "text-emerald-600";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function SectionCard({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-sm text-slate-800">{title}</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      <div
        style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr" }}
        className="overflow-hidden transition-all duration-200"
      >
        <div className="min-h-0">
          <div className="px-5 pb-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

// N/A Popover trigger
function NABadge({ reason }: { reason: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200 transition-colors"
      >
        <MinusCircle className="h-3 w-3" /> N/A
      </button>
      {show && (
        <div className="absolute bottom-full left-0 mb-1 z-50 w-48 rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs text-slate-600">
          {reason}
        </div>
      )}
    </div>
  );
}

// ── Health Panel ──────────────────────────────────────────────────────────────

type HealthStatus = "ok" | "warning" | "missing" | "na";

interface HealthIndicator {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
  naReason?: string;
}

function HealthDot({ status }: { status: HealthStatus }) {
  const map: Record<HealthStatus, string> = {
    ok: "bg-emerald-500",
    warning: "bg-amber-400",
    missing: "bg-red-400",
    na: "bg-slate-300",
  };
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${map[status]}`} />
  );
}

function buildHealthIndicators(
  fv: (key: string) => string,
  clientNationality: string | null,
  hasDocuments: boolean,
  aiDocCount: number,
): HealthIndicator[] {
  const isEnglishExempt = ENGLISH_EXEMPT_NATIONALITIES.includes(clientNationality ?? "");

  const englishNA = fv("english_evidence_na") === "true";
  const englishNAReason = fv("english_evidence_na_reason") || "Marked not applicable";
  const englishScore = fv("english_overall_score");
  const englishType = fv("english_test_type");

  const financialNA = fv("financial_evidence_na") === "true";
  const financialNAReason = fv("financial_evidence_na_reason") || "Marked not applicable";
  const fundsAvailable = fv("funds_available");

  const healthNA = fv("health_assessment_na") === "true";
  const healthNAReason = fv("health_assessment_na_reason") || "Marked not applicable";
  const healthStatus = fv("health_assessment_status");

  const policeNA = fv("police_clearance_na") === "true";
  const policeNAReason = fv("police_clearance_na_reason") || "Marked not applicable";
  const policeStatus = fv("police_clearance_status");

  const gsApproved = fv("gs_client_approved") === "true";
  const gsHasDraft = aiDocCount > 0;

  const coeNumber = fv("coe_number");
  const coeExpiry = fv("coe_expiry_date");
  const oshcProvider = fv("oshc_provider");
  const oshcEnd = fv("oshc_end_date");

  return [
    // 1. CoE
    {
      key: "coe",
      label: "CoE",
      status: coeNumber ? (coeExpiry && daysFromNow(coeExpiry) !== null && daysFromNow(coeExpiry)! < 30 ? "warning" : "ok") : "missing",
      detail: coeNumber
        ? `${coeNumber}${coeExpiry ? ` · expires ${formatDate(coeExpiry)}` : ""}`
        : "No CoE number recorded",
    },
    // 2. OSHC
    {
      key: "oshc",
      label: "OSHC",
      status: oshcProvider ? (oshcEnd && daysFromNow(oshcEnd) !== null && daysFromNow(oshcEnd)! < 30 ? "warning" : "ok") : "missing",
      detail: oshcProvider
        ? `${oshcProvider}${oshcEnd ? ` · ends ${formatDate(oshcEnd)}` : ""}`
        : "No OSHC provider recorded",
    },
    // 3. English Evidence
    {
      key: "english",
      label: "English Evidence",
      status: englishNA || isEnglishExempt ? "na" : (englishScore ? "ok" : "missing"),
      detail: englishNA || isEnglishExempt
        ? ""
        : (englishScore ? `${englishType || "Test"} · ${englishScore}` : "No English test results recorded"),
      naReason: englishNA ? englishNAReason : (isEnglishExempt ? `Exempt — ${clientNationality ?? "nationality"}` : undefined),
    },
    // 4. Financial Evidence
    {
      key: "financial",
      label: "Financial Evidence",
      status: financialNA ? "na" : (fundsAvailable ? "ok" : "missing"),
      detail: financialNA ? "" : (fundsAvailable ? `$${Number(fundsAvailable).toLocaleString()} available` : "No financial evidence recorded"),
      naReason: financialNA ? financialNAReason : undefined,
    },
    // 5. GS Statement
    {
      key: "gs",
      label: "GS Statement",
      status: gsApproved ? "ok" : (gsHasDraft ? "warning" : "missing"),
      detail: gsApproved ? "Client approved" : (gsHasDraft ? `${aiDocCount} draft${aiDocCount !== 1 ? "s" : ""} in AI tools` : "No GS statement drafted"),
    },
    // 6. Health Assessment
    {
      key: "health",
      label: "Health Assessment",
      status: healthNA ? "na" : (healthStatus === "completed" ? "ok" : (healthStatus === "booked" ? "warning" : "missing")),
      detail: healthNA ? "" : (healthStatus === "completed" ? "Completed" : (healthStatus === "booked" ? "Booked — awaiting results" : "Not booked")),
      naReason: healthNA ? healthNAReason : undefined,
    },
    // 7. Police Clearance
    {
      key: "police",
      label: "Police Clearance",
      status: policeNA ? "na" : (policeStatus === "obtained" ? "ok" : "missing"),
      detail: policeNA ? "" : (policeStatus === "obtained" ? "Obtained" : "Not yet obtained"),
      naReason: policeNA ? policeNAReason : undefined,
    },
    // 8. Application
    {
      key: "application",
      label: "Application",
      status: hasDocuments ? "ok" : "missing",
      detail: hasDocuments ? "Documents collected" : "No documents collected yet",
    },
  ];
}

// ── Key Dates ─────────────────────────────────────────────────────────────────

function buildKeyDates(
  props: Pick<SC500OverviewProps, "lodgementDate" | "grantDate" | "visaExpiry" | "clientPassportExpiry" | "fieldValues">
) {
  const { fieldValues } = props;
  const fvFn = (key: string) => {
    const v = fieldValues[key];
    if (v === null || v === undefined) return "";
    return String(v);
  };

  return [
    { label: "Course Start", date: fvFn("course_start_date") || null },
    { label: "Course End", date: fvFn("course_end_date") || null },
    { label: "CoE Expiry", date: fvFn("coe_expiry_date") || null },
    { label: "OSHC End Date", date: fvFn("oshc_end_date") || null },
    { label: "English Test Date", date: fvFn("english_test_date") || null },
    { label: "Passport Expiry", date: props.clientPassportExpiry || null },
    { label: "Current Visa Expiry", date: fvFn("current_visa_expiry") || null },
    { label: "Lodgement Date", date: props.lodgementDate || null },
    { label: "Grant Date", date: props.grantDate || null },
    { label: "Visa Expiry", date: props.visaExpiry || null },
  ];
}

// ── Next Actions ──────────────────────────────────────────────────────────────

function buildNextActions(
  fvFn: (key: string) => string,
  indicators: HealthIndicator[],
  status: string,
): string[] {
  const actions: Array<{ urgency: number; text: string }> = [];

  const missing = indicators.filter(i => i.status === "missing");
  const warning = indicators.filter(i => i.status === "warning");

  for (const m of missing) {
    if (m.key === "coe") actions.push({ urgency: 10, text: "Obtain and record Confirmation of Enrolment (CoE)" });
    else if (m.key === "oshc") actions.push({ urgency: 9, text: "Arrange overseas student health cover (OSHC)" });
    else if (m.key === "english") actions.push({ urgency: 7, text: "Collect English language test results" });
    else if (m.key === "financial") actions.push({ urgency: 8, text: "Collect financial evidence (bank statements)" });
    else if (m.key === "gs") actions.push({ urgency: 6, text: "Draft Genuine Student statement" });
    else if (m.key === "health") actions.push({ urgency: 5, text: "Book health assessment" });
    else if (m.key === "police") actions.push({ urgency: 4, text: "Obtain police clearance certificates" });
    else if (m.key === "application") actions.push({ urgency: 3, text: "Collect and review supporting documents" });
  }

  for (const w of warning) {
    if (w.key === "coe") actions.push({ urgency: 10, text: "CoE is expiring soon — check enrolment" });
    else if (w.key === "oshc") actions.push({ urgency: 9, text: "OSHC is expiring soon — renew coverage" });
    else if (w.key === "gs") actions.push({ urgency: 6, text: "GS statement drafted — send to client for approval" });
    else if (w.key === "health") actions.push({ urgency: 5, text: "Health assessment booked — follow up results" });
  }

  if (status === "lodged" && !fvFn("trn")) {
    actions.push({ urgency: 10, text: "Record Transaction Reference Number (TRN)" });
  }
  if (status === "active" && !fvFn("lodgement_date") && indicators.filter(i => i.status === "missing").length === 0) {
    actions.push({ urgency: 8, text: "All documents ready — prepare for lodgement" });
  }

  actions.sort((a, b) => b.urgency - a.urgency);

  if (actions.length === 0) {
    if (status === "granted") return ["Case has been granted — archive the file"];
    if (status === "refused") return ["Case was refused — advise client on review options"];
    return ["All items on track — no urgent actions"];
  }

  return actions.slice(0, 5).map(a => a.text);
}

// ── FieldEditor (inline) ──────────────────────────────────────────────────────

function FieldEditor({
  caseId,
  fieldKey,
  label,
  value,
  fieldType = "text",
  options,
  onChange,
}: {
  caseId: string;
  fieldKey: string;
  label: string;
  value: string;
  fieldType?: string;
  options?: string[];
  onChange: (key: string, value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocal(value); }, [value]);

  const save = useCallback(async () => {
    if (local === value) return;
    setSaving(true);
    try {
      await fetch(`/api/cases/${caseId}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_key: fieldKey, value: local }),
      });
      onChange(fieldKey, local);
    } finally {
      setSaving(false);
    }
  }, [caseId, fieldKey, local, value, onChange]);

  const inputClass = "w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors";

  return (
    <div className="grid grid-cols-[140px,1fr] items-center gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <label className="text-xs font-medium text-slate-500 truncate">{label}</label>
      <div className="relative">
        {fieldType === "select" && options ? (
          <select value={local} onChange={e => setLocal(e.target.value)} onBlur={save} className={inputClass}>
            <option value="">— not set —</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : fieldType === "date" ? (
          <input type="date" value={local} onChange={e => setLocal(e.target.value)} onBlur={save} className={inputClass} />
        ) : fieldType === "currency" ? (
          <input type="number" value={local} onChange={e => setLocal(e.target.value)} onBlur={save} className={inputClass} placeholder="0.00" step="0.01" />
        ) : fieldType === "checkbox" ? (
          <input type="checkbox" checked={local === "true"} onChange={e => { setLocal(e.target.checked ? "true" : "false"); save(); }} className="h-4 w-4 rounded border-slate-300" />
        ) : (
          <input type="text" value={local} onChange={e => setLocal(e.target.value)} onBlur={save} className={inputClass} />
        )}
        {saving && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-slate-400" />}
      </div>
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  note: MessageSquare,
  email: Send,
  communication: MessageSquare,
  stage_completed: CheckCircle2,
  document_uploaded: FileText,
  ai_document: Zap,
  deadline: Calendar,
};

const ACTIVITY_COLORS: Record<string, string> = {
  note: "bg-blue-100 text-blue-600",
  email: "bg-indigo-100 text-indigo-600",
  communication: "bg-slate-100 text-slate-500",
  stage_completed: "bg-emerald-100 text-emerald-600",
  document_uploaded: "bg-amber-100 text-amber-600",
  ai_document: "bg-violet-100 text-violet-600",
  deadline: "bg-red-100 text-red-600",
};

function ActivityFeed({ caseId }: { caseId: string }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  const postNote = useCallback(async () => {
    if (!noteText.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteText.trim() }),
      });
      if (res.ok) {
        setNoteText("");
        await fetchActivity();
      }
    } finally {
      setPosting(false);
    }
  }, [caseId, noteText, fetchActivity]);

  return (
    <div className="space-y-4">
      {/* Add Note */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <textarea
          ref={textareaRef}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          onKeyDown={e => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postNote();
          }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-400">⌘ Enter to save</span>
          <button
            onClick={postNote}
            disabled={posting || !noteText.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Add Note
          </button>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-6">No activity yet</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const Icon = ACTIVITY_ICONS[item.type] ?? MessageSquare;
            const colorClass = ACTIVITY_COLORS[item.type] ?? "bg-slate-100 text-slate-500";
            return (
              <div key={item.id} className="flex gap-3">
                <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${colorClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700 leading-snug">{item.title}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{relativeTime(item.created_at)}</span>
                  </div>
                  {item.body && (
                    <p className="mt-0.5 text-sm text-slate-500 whitespace-pre-wrap line-clamp-3">{item.body}</p>
                  )}
                  {item.author && (
                    <p className="mt-0.5 text-xs text-slate-400">{item.author}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SC500Overview(props: SC500OverviewProps) {
  const {
    caseId,
    refNumber,
    status,
    lodgementDate,
    grantDate,
    visaExpiry,
    clientPassportExpiry,
    currentStageLabel,
    trn,
    clientName,
    clientNationality,
    agentName,
    fieldValues: initialFieldValues,
    hasDocuments,
    aiDocCount,
  } = props;

  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>(initialFieldValues);

  const fvFn = useCallback((key: string) => fv(fieldValues, key), [fieldValues]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const isOnshore = fvFn("current_visa_subclass") !== "";
  const healthIndicators = buildHealthIndicators(fvFn, clientNationality, hasDocuments, aiDocCount);
  const nextActions = buildNextActions(fvFn, healthIndicators, status);
  const keyDates = buildKeyDates({ lodgementDate, grantDate, visaExpiry, clientPassportExpiry, fieldValues });

  const healthSummary = {
    ok: healthIndicators.filter(i => i.status === "ok").length,
    warning: healthIndicators.filter(i => i.status === "warning").length,
    missing: healthIndicators.filter(i => i.status === "missing").length,
  };

  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const statusClass = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-4 pb-8">

      {/* ── Section 1: Compact Header Bar ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Student name */}
          <div className="flex items-center gap-2 mr-2">
            <User className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-800 text-sm">
              {clientName ?? "Unknown client"}
            </span>
          </div>

          {/* Nationality */}
          {clientNationality && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Globe className="h-3.5 w-3.5" />
              {clientNationality}
            </div>
          )}

          {/* Subclass badge */}
          <Pill className="bg-blue-50 text-blue-700 font-semibold">SC-500</Pill>

          {/* Status */}
          <Pill className={statusClass}>{statusLabel}</Pill>

          {/* Onshore/Offshore */}
          <Pill className={isOnshore ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}>
            {isOnshore ? "Onshore" : "Offshore"}
          </Pill>

          {/* Stage */}
          {currentStageLabel && (
            <span className="text-xs text-slate-400">{currentStageLabel}</span>
          )}

          <div className="flex-1" />

          {/* Agent */}
          {agentName && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <User className="h-3.5 w-3.5" />
              {agentName}
            </div>
          )}

          {/* Ref number */}
          {refNumber && (
            <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
              {refNumber}
            </code>
          )}

          {/* TRN */}
          {trn && (
            <div className="text-xs text-slate-400">TRN: <span className="font-mono">{trn}</span></div>
          )}
        </div>
      </div>

      {/* ── Main Grid: 2 cols on lg ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* ── Section 2: Case Health Panel ── */}
        <SectionCard title="Case Health" icon={Activity} defaultOpen={true}>
          {/* Summary bar */}
          <div className="mb-4 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> {healthSummary.ok} ok
            </span>
            {healthSummary.warning > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> {healthSummary.warning} need attention
              </span>
            )}
            {healthSummary.missing > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="h-3.5 w-3.5" /> {healthSummary.missing} missing
              </span>
            )}
          </div>

          <div className="space-y-2">
            {healthIndicators.map(indicator => (
              <div key={indicator.key} className="flex items-start gap-3">
                <HealthDot status={indicator.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{indicator.label}</span>
                    {indicator.status === "na" && indicator.naReason && (
                      <NABadge reason={indicator.naReason} />
                    )}
                  </div>
                  {indicator.detail && (
                    <p className="text-xs text-slate-400 mt-0.5">{indicator.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Section 4: Next Actions ── */}
        <SectionCard title="Next Actions" icon={Zap} defaultOpen={true}>
          <div className="space-y-2">
            {nextActions.map((action, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 leading-snug">{action}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Section 3: Key Dates ── */}
        <SectionCard title="Key Dates" icon={Calendar} defaultOpen={true}>
          <div className="space-y-0">
            {keyDates.map(({ label, date }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-xs font-medium text-slate-500">{label}</span>
                <span className={`text-xs ${date ? dateColor(date) : "text-slate-300"}`}>
                  {date ? (
                    <>
                      {formatDate(date)}
                      {daysFromNow(date) !== null && daysFromNow(date)! >= 0 && (
                        <span className="ml-1.5 text-slate-400">in {daysFromNow(date)}d</span>
                      )}
                      {daysFromNow(date) !== null && daysFromNow(date)! < 0 && (
                        <span className="ml-1.5">{Math.abs(daysFromNow(date)!)}d ago</span>
                      )}
                    </>
                  ) : "—"}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Section 5: Activity Feed ── */}
        <SectionCard title="Activity" icon={MessageSquare} defaultOpen={true}>
          <ActivityFeed caseId={caseId} />
        </SectionCard>
      </div>

      {/* ── Section 6: Case Data (collapsible, default closed) ── */}
      <SectionCard title="Case Data" icon={Info} defaultOpen={false}>
        <div className="space-y-6">
          {/* Enrolment */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Enrolment</h4>
            <div className="space-y-0">
              <FieldEditor caseId={caseId} fieldKey="course_name" label="Course Name" value={fvFn("course_name")} onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="education_provider" label="Provider" value={fvFn("education_provider")} onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="provider_cricos_code" label="CRICOS Code" value={fvFn("provider_cricos_code")} onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="course_level" label="Course Level" value={fvFn("course_level")} onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="course_start_date" label="Start Date" value={fvFn("course_start_date")} fieldType="date" onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="course_end_date" label="End Date" value={fvFn("course_end_date")} fieldType="date" onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="coe_number" label="CoE Number" value={fvFn("coe_number")} onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="coe_issue_date" label="CoE Issue Date" value={fvFn("coe_issue_date")} fieldType="date" onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="coe_expiry_date" label="CoE Expiry" value={fvFn("coe_expiry_date")} fieldType="date" onChange={handleFieldChange} />
            </div>
          </div>

          {/* OSHC */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">OSHC</h4>
            <div className="space-y-0">
              <FieldEditor caseId={caseId} fieldKey="oshc_provider" label="OSHC Provider" value={fvFn("oshc_provider")} onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="oshc_policy_number" label="Policy Number" value={fvFn("oshc_policy_number")} onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="oshc_start_date" label="Start Date" value={fvFn("oshc_start_date")} fieldType="date" onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="oshc_end_date" label="End Date" value={fvFn("oshc_end_date")} fieldType="date" onChange={handleFieldChange} />
            </div>
          </div>

          {/* English */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
              English Evidence
              <button
                onClick={async () => {
                  const current = fvFn("english_evidence_na") === "true";
                  const newVal = !current ? "true" : "false";
                  await fetch(`/api/cases/${caseId}/fields`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ field_key: "english_evidence_na", value: newVal }),
                  });
                  handleFieldChange("english_evidence_na", newVal);
                }}
                className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${fvFn("english_evidence_na") === "true" ? "bg-slate-200 text-slate-600 border-slate-300" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100"}`}
              >
                {fvFn("english_evidence_na") === "true" ? "Marked N/A" : "Mark N/A"}
              </button>
            </h4>
            <div className="space-y-0">
              <FieldEditor caseId={caseId} fieldKey="english_test_type" label="Test Type" value={fvFn("english_test_type")}
                fieldType="select" options={["IELTS", "PTE Academic", "TOEFL iBT", "Cambridge C1/C2", "OET"]}
                onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="english_test_date" label="Test Date" value={fvFn("english_test_date")} fieldType="date" onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="english_overall_score" label="Overall Score" value={fvFn("english_overall_score")} onChange={handleFieldChange} />
              {fvFn("english_evidence_na") === "true" && (
                <FieldEditor caseId={caseId} fieldKey="english_evidence_na_reason" label="N/A Reason" value={fvFn("english_evidence_na_reason")} onChange={handleFieldChange} />
              )}
            </div>
          </div>

          {/* Financial */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
              Financial Evidence
              <button
                onClick={async () => {
                  const current = fvFn("financial_evidence_na") === "true";
                  const newVal = !current ? "true" : "false";
                  await fetch(`/api/cases/${caseId}/fields`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ field_key: "financial_evidence_na", value: newVal }),
                  });
                  handleFieldChange("financial_evidence_na", newVal);
                }}
                className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${fvFn("financial_evidence_na") === "true" ? "bg-slate-200 text-slate-600 border-slate-300" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100"}`}
              >
                {fvFn("financial_evidence_na") === "true" ? "Marked N/A" : "Mark N/A"}
              </button>
            </h4>
            <div className="space-y-0">
              <FieldEditor caseId={caseId} fieldKey="funds_available" label="Funds Available (AUD)" value={fvFn("funds_available")} fieldType="currency" onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="funds_source" label="Source of Funds" value={fvFn("funds_source")} onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="financial_sponsor_name" label="Sponsor Name" value={fvFn("financial_sponsor_name")} onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="financial_sponsor_relationship" label="Sponsor Relationship" value={fvFn("financial_sponsor_relationship")} onChange={handleFieldChange} />
              {fvFn("financial_evidence_na") === "true" && (
                <FieldEditor caseId={caseId} fieldKey="financial_evidence_na_reason" label="N/A Reason" value={fvFn("financial_evidence_na_reason")} onChange={handleFieldChange} />
              )}
            </div>
          </div>

          {/* Health Assessment */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
              Health Assessment
              <button
                onClick={async () => {
                  const current = fvFn("health_assessment_na") === "true";
                  const newVal = !current ? "true" : "false";
                  await fetch(`/api/cases/${caseId}/fields`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ field_key: "health_assessment_na", value: newVal }),
                  });
                  handleFieldChange("health_assessment_na", newVal);
                }}
                className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${fvFn("health_assessment_na") === "true" ? "bg-slate-200 text-slate-600 border-slate-300" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100"}`}
              >
                {fvFn("health_assessment_na") === "true" ? "Marked N/A" : "Mark N/A"}
              </button>
            </h4>
            <div className="space-y-0">
              <FieldEditor caseId={caseId} fieldKey="health_assessment_status" label="Status" value={fvFn("health_assessment_status")}
                fieldType="select" options={["not_booked", "booked", "completed"]}
                onChange={handleFieldChange} />
              {fvFn("health_assessment_na") === "true" && (
                <FieldEditor caseId={caseId} fieldKey="health_assessment_na_reason" label="N/A Reason" value={fvFn("health_assessment_na_reason")} onChange={handleFieldChange} />
              )}
            </div>
          </div>

          {/* Police Clearance */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
              Police Clearance
              <button
                onClick={async () => {
                  const current = fvFn("police_clearance_na") === "true";
                  const newVal = !current ? "true" : "false";
                  await fetch(`/api/cases/${caseId}/fields`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ field_key: "police_clearance_na", value: newVal }),
                  });
                  handleFieldChange("police_clearance_na", newVal);
                }}
                className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${fvFn("police_clearance_na") === "true" ? "bg-slate-200 text-slate-600 border-slate-300" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100"}`}
              >
                {fvFn("police_clearance_na") === "true" ? "Marked N/A" : "Mark N/A"}
              </button>
            </h4>
            <div className="space-y-0">
              <FieldEditor caseId={caseId} fieldKey="police_clearance_status" label="Status" value={fvFn("police_clearance_status")}
                fieldType="select" options={["not_obtained", "obtained"]}
                onChange={handleFieldChange} />
              {fvFn("police_clearance_na") === "true" && (
                <FieldEditor caseId={caseId} fieldKey="police_clearance_na_reason" label="N/A Reason" value={fvFn("police_clearance_na_reason")} onChange={handleFieldChange} />
              )}
            </div>
          </div>

          {/* GS */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Genuine Student</h4>
            <div className="space-y-0">
              <FieldEditor caseId={caseId} fieldKey="gs_client_approved" label="Client Approved" value={fvFn("gs_client_approved")} fieldType="checkbox" onChange={handleFieldChange} />
            </div>
          </div>

          {/* Visa History */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Immigration History</h4>
            <div className="space-y-0">
              <FieldEditor caseId={caseId} fieldKey="current_visa_subclass" label="Current Visa" value={fvFn("current_visa_subclass")} onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="current_visa_expiry" label="Current Visa Expiry" value={fvFn("current_visa_expiry")} fieldType="date" onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="previous_australian_visas" label="Previous AU Visas" value={fvFn("previous_australian_visas")} onChange={handleFieldChange} />
              <FieldEditor caseId={caseId} fieldKey="previous_visa_refusals" label="Previous Refusals" value={fvFn("previous_visa_refusals")} fieldType="select" options={["No", "Yes"]} onChange={handleFieldChange} />
              {fvFn("previous_visa_refusals") === "Yes" && (
                <FieldEditor caseId={caseId} fieldKey="refusal_details" label="Refusal Details" value={fvFn("refusal_details")} onChange={handleFieldChange} />
              )}
            </div>
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
