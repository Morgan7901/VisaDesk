"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Search, Plus, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewCaseModal } from "@/components/cases/NewCaseModal";

export interface CaseRow {
  id: string;
  ref_number: string | null;
  visa_subclass: string;
  status: string;
  created_at: string;
  updated_at: string;
  current_stage_label: string | null;
  clients: { full_name: string } | null;
  agent: { full_name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-blue-50 text-blue-700",
  submitted: "bg-amber-50 text-amber-700",
  granted:   "bg-green-50 text-green-700",
  refused:   "bg-red-50 text-red-700",
  withdrawn: "bg-slate-100 text-slate-500",
  closed:    "bg-slate-100 text-slate-500",
};

const ALL_STATUSES = ["active", "submitted", "granted", "refused", "withdrawn"];

const VISA_SUBCLASSES = ["189", "190", "482", "494", "500", "820", "186"];

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-500"
      )}
    >
      {status}
    </span>
  );
}

interface CaseTableProps {
  cases: CaseRow[];
}

export function CaseTable({ cases }: CaseTableProps) {
  const [search, setSearch] = useState("");
  const [visaFilter, setVisaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cases.filter((c) => {
      const matchSearch =
        !q ||
        (c.ref_number ?? "").toLowerCase().includes(q) ||
        (c.clients?.full_name ?? "").toLowerCase().includes(q);
      const matchVisa = !visaFilter || c.visa_subclass === visaFilter;
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchSearch && matchVisa && matchStatus;
    });
  }, [cases, search, visaFilter, statusFilter]);

  const selectCls =
    "border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <>
      <div className="bg-white border border-slate-200">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3.5">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
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
          <select
            value={visaFilter}
            onChange={(e) => setVisaFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">All visa types</option>
            {VISA_SUBCLASSES.map((v) => (
              <option key={v} value={v}>
                SC-{v}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          {/* New Case */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="ml-auto flex items-center gap-1.5 bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Case
          </button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Briefcase className="h-8 w-8" />
            <p className="text-sm">
              {cases.length === 0
                ? "No cases yet. Create your first case."
                : "No cases match your filters."}
            </p>
            {cases.length === 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-1 flex items-center gap-1.5 bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Case
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {["Ref #", "Client", "Visa", "Status", "Stage", "Agent", "Created", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-400 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {c.ref_number ?? "—"}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {c.clients?.full_name ?? "—"}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="inline-block bg-[#0f172a] px-2 py-0.5 text-xs font-medium text-white">
                        SC-{c.visa_subclass}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 max-w-[160px] truncate">
                      {c.current_stage_label ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {c.agent?.full_name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatDistanceToNow(parseISO(c.created_at), {
                        addSuffix: true,
                      })}
                    </td>
                    <td className="pr-4 text-right whitespace-nowrap">
                      <a
                        href={`/dashboard/cases/${c.id}`}
                        className="text-sm font-medium text-navy-600 hover:underline"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-2.5">
            <p className="text-xs text-slate-400">
              {filtered.length} of {cases.length} case{cases.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      <NewCaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
