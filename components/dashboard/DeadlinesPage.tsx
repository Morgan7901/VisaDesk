"use client";

import { useState, useMemo } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { Plus, CalendarX, Trash2, CheckCheck, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeadlineItem {
  id: string;
  label: string;
  deadline_date: string;
  deadline_type: string | null;
  is_complete: boolean;
  case_id: string;
  ref_number: string | null;
  visa_subclass: string;
  client_name: string | null;
}

export interface CaseOption {
  id: string;
  ref_number: string;
  visa_subclass: string;
  client_name: string | null;
}

interface Props {
  deadlines: DeadlineItem[];
  cases: CaseOption[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEADLINE_TYPES = ["dha", "document", "client", "internal"] as const;
type DeadlineType = (typeof DEADLINE_TYPES)[number];

const TYPE_STYLES: Record<DeadlineType, string> = {
  dha:      "bg-red-50 text-red-700",
  document: "bg-amber-50 text-amber-700",
  client:   "bg-blue-50 text-blue-700",
  internal: "bg-slate-100 text-slate-600",
};

const TYPE_LABELS: Record<DeadlineType, string> = {
  dha:      "DHA",
  document: "Document",
  client:   "Client",
  internal: "Internal",
};

const VISA_SUBCLASSES = ["189", "190", "482", "494", "500", "820", "186"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysFromToday(dateStr: string): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return differenceInCalendarDays(parseISO(dateStr), todayStart);
}

function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "EEE d MMM yyyy");
}

function DaysChip({ days }: { days: number }) {
  if (days < 0)
    return (
      <span className="text-xs font-semibold text-red-600 tabular-nums whitespace-nowrap">
        {Math.abs(days)}d overdue
      </span>
    );
  if (days === 0)
    return <span className="text-xs font-semibold text-red-600 whitespace-nowrap">Today</span>;
  if (days <= 3)
    return <span className="text-xs font-semibold text-red-500 tabular-nums whitespace-nowrap">{days}d left</span>;
  if (days <= 7)
    return <span className="text-xs font-medium text-amber-600 tabular-nums whitespace-nowrap">{days}d left</span>;
  if (days <= 30)
    return <span className="text-xs font-medium text-slate-500 tabular-nums whitespace-nowrap">{days}d left</span>;
  return <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">{days}d left</span>;
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const t = type as DeadlineType;
  return (
    <span className={cn("inline-block px-2 py-0.5 text-xs font-medium capitalize", TYPE_STYLES[t] ?? "bg-slate-100 text-slate-600")}>
      {TYPE_LABELS[t] ?? type}
    </span>
  );
}

function VisaBadge({ subclass }: { subclass: string }) {
  return (
    <span className="inline-block bg-[#0f172a] px-2 py-0.5 text-xs font-medium text-white">
      SC-{subclass}
    </span>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ label, count, accent }: { label: string; count: number; accent?: string }) {
  return (
    <div className={cn("flex items-center gap-2 px-5 py-2 border-b border-slate-100", accent ?? "bg-slate-50")}>
      <span className={cn("text-xs font-semibold uppercase tracking-wide", accent ? "text-red-700" : "text-slate-500")}>
        {label}
      </span>
      <span className="text-xs text-slate-400">({count})</span>
    </div>
  );
}

// ─── New Deadline Modal ───────────────────────────────────────────────────────

function NewDeadlineModal({
  cases,
  onClose,
  onCreated,
}: {
  cases: CaseOption[];
  onClose: () => void;
  onCreated: (d: DeadlineItem) => void;
}) {
  const [label, setLabel] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineType, setDeadlineType] = useState<string>("internal");
  const [caseSearch, setCaseSearch] = useState("");
  const [selectedCase, setSelectedCase] = useState<CaseOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCases = useMemo(() => {
    const q = caseSearch.toLowerCase();
    if (!q) return cases.slice(0, 8);
    return cases
      .filter(
        (c) =>
          c.ref_number.toLowerCase().includes(q) ||
          (c.client_name ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [cases, caseSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !label || !deadlineDate) {
      setError("All fields are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/deadlines/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: selectedCase.id,
        label,
        deadline_date: deadlineDate,
        deadline_type: deadlineType,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Failed to create deadline.");
      setSaving(false);
      return;
    }
    // Optimistically return a new item — no id from server, use temp
    onCreated({
      id: `temp-${Date.now()}`,
      label,
      deadline_date: deadlineDate,
      deadline_type: deadlineType,
      is_complete: false,
      case_id: selectedCase.id,
      ref_number: selectedCase.ref_number,
      visa_subclass: selectedCase.visa_subclass,
      client_name: selectedCase.client_name,
    });
    setSaving(false);
    onClose();
  };

  const inputCls =
    "w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">New Deadline</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* Case selector */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Case</label>
            {selectedCase ? (
              <div className="flex items-center justify-between border border-slate-300 px-3 py-2 text-sm">
                <span className="text-slate-800">
                  {selectedCase.ref_number} — {selectedCase.client_name ?? "Unknown"}
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedCase(null); setCaseSearch(""); }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={caseSearch}
                  onChange={(e) => setCaseSearch(e.target.value)}
                  placeholder="Search by ref or client…"
                  className={cn(inputCls, "pl-8")}
                />
                {filteredCases.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full border border-slate-200 bg-white shadow-md max-h-40 overflow-y-auto">
                    {filteredCases.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedCase(c); setCaseSearch(""); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-800">{c.ref_number}</span>
                          <span className="ml-2 text-slate-500">{c.client_name ?? "Unknown"}</span>
                          <span className="ml-1 text-xs text-slate-400">SC-{c.visa_subclass}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Label */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Submit Skills Assessment"
              className={inputCls}
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Due Date</label>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
            <select
              value={deadlineType}
              onChange={(e) => setDeadlineType(e.target.value)}
              className={inputCls}
            >
              {DEADLINE_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating…" : "Create Deadline"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Deadline Row ─────────────────────────────────────────────────────────────

function DeadlineRow({
  item,
  onComplete,
  onDelete,
}: {
  item: DeadlineItem;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const days = daysFromToday(item.deadline_date);

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 border-b border-slate-100 last:border-0",
      item.is_complete ? "opacity-60" : ""
    )}>
      {/* Label + case link */}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium text-slate-800 truncate", item.is_complete && "line-through text-slate-500")}>
          {item.label}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <a
            href={`/dashboard/cases/${item.case_id}`}
            className="text-xs text-slate-500 hover:text-slate-800 hover:underline font-mono"
          >
            {item.ref_number ?? "—"}
          </a>
          {item.client_name && (
            <span className="text-xs text-slate-400">· {item.client_name}</span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 shrink-0">
        <VisaBadge subclass={item.visa_subclass} />
        <TypeBadge type={item.deadline_type} />
      </div>

      {/* Date + days chip */}
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(item.deadline_date)}</span>
        {!item.is_complete && <DaysChip days={days} />}
        {item.is_complete && <span className="text-xs text-green-600 font-medium">Completed</span>}
      </div>

      {/* Actions */}
      {!item.is_complete && (
        <button
          onClick={() => onComplete(item.id)}
          className="flex shrink-0 items-center gap-1 border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:border-green-300 hover:text-green-600 transition-colors"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Done
        </button>
      )}
      <button
        onClick={() => onDelete(item.id)}
        className="flex shrink-0 items-center gap-1 border border-slate-200 px-2 py-1 text-xs text-slate-400 hover:border-red-300 hover:text-red-600 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Group ────────────────────────────────────────────────────────────────────

function Group({
  label,
  items,
  accent,
  onComplete,
  onDelete,
}: {
  label: string;
  items: DeadlineItem[];
  accent?: boolean;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 overflow-hidden">
      <SectionHeader label={label} count={items.length} accent={accent ? "bg-red-50" : undefined} />
      {items.map((item) => (
        <DeadlineRow key={item.id} item={item} onComplete={onComplete} onDelete={onDelete} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DeadlinesPage({ deadlines: initial, cases }: Props) {
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>(initial);
  const [view, setView] = useState<"upcoming" | "completed">("upcoming");
  const [typeFilter, setTypeFilter] = useState("");
  const [visaFilter, setVisaFilter] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  void deleting; // used to block UI during delete (future enhancement)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleComplete = async (id: string) => {
    // Optimistic update
    setDeadlines((prev) =>
      prev.map((d) => (d.id === id ? { ...d, is_complete: true } : d))
    );
    const res = await fetch(`/api/deadlines/${id}/complete`, { method: "PATCH" });
    if (!res.ok) {
      // Revert
      setDeadlines((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_complete: false } : d))
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this deadline? This cannot be undone.")) return;
    setDeleting(id);
    const res = await fetch(`/api/deadlines/${id}/delete`, { method: "DELETE" });
    if (res.ok) {
      setDeadlines((prev) => prev.filter((d) => d.id !== id));
    }
    setDeleting(null);
  };

  const handleCreated = (d: DeadlineItem) => {
    setDeadlines((prev) => [...prev, d]);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return deadlines.filter((d) => {
      if (view === "upcoming" && d.is_complete) return false;
      if (view === "completed" && !d.is_complete) return false;
      if (typeFilter && d.deadline_type !== typeFilter) return false;
      if (visaFilter && d.visa_subclass !== visaFilter) return false;
      if (q && !d.label.toLowerCase().includes(q) && !(d.client_name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [deadlines, view, typeFilter, visaFilter, search]);

  // ── Grouping (upcoming only) ───────────────────────────────────────────────

  const groups = useMemo(() => {
    if (view === "completed") return null;
    const overdue: DeadlineItem[] = [];
    const todayItems: DeadlineItem[] = [];
    const thisWeek: DeadlineItem[] = [];
    const thisMonth: DeadlineItem[] = [];
    const later: DeadlineItem[] = [];

    for (const d of filtered) {
      const days = daysFromToday(d.deadline_date);
      if (days < 0) overdue.push(d);
      else if (days === 0) todayItems.push(d);
      else if (days <= 7) thisWeek.push(d);
      else if (days <= 30) thisMonth.push(d);
      else later.push(d);
    }

    return { overdue, today: todayItems, thisWeek, thisMonth, later };
  }, [filtered, view]);

  const selectCls =
    "border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  const isEmpty = filtered.length === 0;

  return (
    <>
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle */}
          <div className="flex border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView("upcoming")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                view === "upcoming"
                  ? "bg-[#0f172a] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              Upcoming
            </button>
            <button
              onClick={() => setView("completed")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200",
                view === "completed"
                  ? "bg-[#0f172a] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              Completed
            </button>
          </div>

          {/* Type filter */}
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
            <option value="">All types</option>
            {DEADLINE_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>

          {/* Visa filter */}
          <select value={visaFilter} onChange={(e) => setVisaFilter(e.target.value)} className={selectCls}>
            <option value="">All visa types</option>
            {VISA_SUBCLASSES.map((v) => (
              <option key={v} value={v}>SC-{v}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by label or client…"
              className="w-full border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          {/* New deadline */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="ml-auto flex items-center gap-1.5 bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Deadline
          </button>
        </div>

        {/* Content */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400 bg-white border border-slate-200">
            <CalendarX className="h-8 w-8" />
            <p className="text-sm">
              {deadlines.length === 0
                ? "No deadlines yet. Create your first deadline."
                : "No deadlines match your filters."}
            </p>
          </div>
        ) : view === "completed" ? (
          <div className="bg-white border border-slate-200">
            {filtered.map((item) => (
              <DeadlineRow
                key={item.id}
                item={item}
                onComplete={handleComplete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <Group label="Overdue" items={groups!.overdue} accent onComplete={handleComplete} onDelete={handleDelete} />
            <Group label="Today" items={groups!.today} accent onComplete={handleComplete} onDelete={handleDelete} />
            <Group label="This Week" items={groups!.thisWeek} onComplete={handleComplete} onDelete={handleDelete} />
            <Group label="This Month" items={groups!.thisMonth} onComplete={handleComplete} onDelete={handleDelete} />
            <Group label="Later" items={groups!.later} onComplete={handleComplete} onDelete={handleDelete} />
          </div>
        )}
      </div>

      {isModalOpen && (
        <NewDeadlineModal
          cases={cases}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
