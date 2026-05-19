"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarDays, formatDistanceToNow, parseISO } from "date-fns";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PipelineCase {
  id: string;
  ref_number: string | null;
  visa_subclass: string;
  status: string;
  current_stage_label: string | null;
  client_name: string | null;
  agent_name: string | null;
  updated_at: string;
}

interface Column {
  key: string;
  label: string;
  accent: {
    header: string;
    card: string;
    empty: string;
    count: string;
  };
}

// ─── Column definitions ───────────────────────────────────────────────────────

const COLUMNS: Column[] = [
  {
    key: "onboarding",
    label: "Onboarding",
    accent: {
      header: "bg-violet-50 border-violet-200",
      card:   "",
      empty:  "border-violet-200",
      count:  "bg-violet-100 text-violet-700",
    },
  },
  {
    key: "in_progress",
    label: "In Progress",
    accent: {
      header: "bg-blue-50 border-blue-200",
      card:   "",
      empty:  "border-blue-200",
      count:  "bg-blue-100 text-blue-700",
    },
  },
  {
    key: "lodged",
    label: "Lodged",
    accent: {
      header: "bg-amber-50 border-amber-200",
      card:   "",
      empty:  "border-amber-200",
      count:  "bg-amber-100 text-amber-700",
    },
  },
  {
    key: "granted",
    label: "Granted",
    accent: {
      header: "bg-green-50 border-green-200",
      card:   "bg-green-50/60",
      empty:  "border-green-200",
      count:  "bg-green-100 text-green-700",
    },
  },
  {
    key: "refused",
    label: "Refused",
    accent: {
      header: "bg-red-50 border-red-200",
      card:   "bg-red-50/60",
      empty:  "border-red-200",
      count:  "bg-red-100 text-red-700",
    },
  },
  {
    key: "withdrawn",
    label: "Withdrawn",
    accent: {
      header: "bg-slate-100 border-slate-200",
      card:   "bg-slate-50",
      empty:  "border-slate-200",
      count:  "bg-slate-200 text-slate-600",
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyCase(c: PipelineCase): string {
  const stage = (c.current_stage_label ?? "").toLowerCase();
  const status = c.status.toLowerCase();

  if (status === "granted")   return "granted";
  if (status === "refused")   return "refused";
  if (status === "withdrawn") return "withdrawn";

  if (stage.includes("onboarding"))                                return "onboarding";
  if (stage.includes("lodgement") || stage.includes("post-lodge") ||
      status === "submitted")                                       return "lodged";

  return "in_progress";
}

function daysSince(updatedAt: string): number {
  return differenceInCalendarDays(new Date(), parseISO(updatedAt));
}

function StalenessChip({ days }: { days: number }) {
  if (days <= 7)
    return (
      <span className="text-xs text-slate-400 tabular-nums">
        {formatDistanceToNow(new Date(Date.now() - days * 86400000), { addSuffix: true })}
      </span>
    );
  if (days <= 14)
    return <span className="text-xs font-medium text-amber-600 tabular-nums">{days}d ago</span>;
  return <span className="text-xs font-semibold text-red-600 tabular-nums">{days}d ago</span>;
}

// ─── Case card ────────────────────────────────────────────────────────────────

function CaseCard({ c, cardCls }: { c: PipelineCase; cardCls: string }) {
  const days = daysSince(c.updated_at);

  return (
    <a
      href={`/dashboard/cases/${c.id}`}
      className={cn(
        "block border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all",
        cardCls
      )}
    >
      {/* Ref + visa badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-slate-700 leading-tight">
          {c.ref_number ?? "—"}
        </span>
        <span className="shrink-0 bg-[#0f172a] px-1.5 py-px text-[10px] font-semibold text-white leading-tight">
          SC-{c.visa_subclass}
        </span>
      </div>

      {/* Client name */}
      <p className="mt-1.5 text-sm font-medium text-slate-800 leading-tight truncate">
        {c.client_name ?? "—"}
      </p>

      {/* Stage label */}
      {c.current_stage_label && (
        <p className="mt-1 text-xs text-slate-500 truncate">
          {c.current_stage_label}
        </p>
      )}

      {/* Footer: agent + staleness */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-slate-400">
          {c.agent_name ?? "Unassigned"}
        </span>
        <StalenessChip days={days} />
      </div>
    </a>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KanbanColumn({
  col,
  cards,
}: {
  col: Column;
  cards: PipelineCase[];
}) {
  return (
    <div className="flex w-64 shrink-0 flex-col">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between border px-3 py-2.5 mb-2",
        col.accent.header
      )}>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          {col.label}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", col.accent.count)}>
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {cards.length === 0 ? (
          <div className={cn(
            "flex items-center justify-center border-2 border-dashed px-3 py-6 text-xs text-slate-400",
            col.accent.empty
          )}>
            No cases
          </div>
        ) : (
          cards.map((c) => (
            <CaseCard key={c.id} c={c} cardCls={col.accent.card} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PipelinePage({ cases }: { cases: PipelineCase[] }) {
  const [visaFilter, setVisaFilter]   = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [search, setSearch]           = useState("");

  // Derive unique options for filters
  const visaSubclasses = useMemo(
    () => Array.from(new Set(cases.map((c) => c.visa_subclass))).sort(),
    [cases]
  );
  const agents = useMemo(
    () =>
      Array.from(new Set(cases.map((c) => c.agent_name).filter(Boolean))).sort() as string[],
    [cases]
  );

  // Apply filters
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cases.filter((c) => {
      if (visaFilter && c.visa_subclass !== visaFilter) return false;
      if (agentFilter && c.agent_name !== agentFilter) return false;
      if (q && !(c.client_name ?? "").toLowerCase().includes(q) &&
               !(c.ref_number ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cases, visaFilter, agentFilter, search]);

  // Bucket into columns
  const buckets = useMemo(() => {
    const map: Record<string, PipelineCase[]> = {};
    COLUMNS.forEach((col) => { map[col.key] = []; });
    filtered.forEach((c) => {
      const key = classifyCase(c);
      map[key]?.push(c);
    });
    return map;
  }, [filtered]);

  const selectCls =
    "border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    // -mx-6 -mt-6 cancels the parent p-6 so the board can use full width with its own scroll
    <div className="-mx-6 -mt-6 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-6 py-3.5 shrink-0">
        {/* Search */}
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client or ref…"
            className="w-full border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        {/* Visa filter */}
        <select value={visaFilter} onChange={(e) => setVisaFilter(e.target.value)} className={selectCls}>
          <option value="">All visa types</option>
          {visaSubclasses.map((v) => (
            <option key={v} value={v}>SC-{v}</option>
          ))}
        </select>

        {/* Agent filter */}
        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className={selectCls}>
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Summary */}
        <span className="ml-auto text-xs text-slate-400">
          {filtered.length} of {cases.length} case{cases.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Board — horizontal scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex gap-4 p-6 min-w-max min-h-full items-start">
          {COLUMNS.map((col) => (
            <KanbanColumn key={col.key} col={col} cards={buckets[col.key] ?? []} />
          ))}
        </div>
      </div>
    </div>
  );
}
