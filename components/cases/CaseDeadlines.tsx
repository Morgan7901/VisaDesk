"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { CalendarX, CheckCheck, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Deadline {
  id: string;
  label: string;
  deadline_date: string;
  deadline_type: string | null;
  is_complete: boolean;
}

const TYPE_STYLES: Record<string, string> = {
  dha:      "bg-red-50 text-red-700",
  document: "bg-amber-50 text-amber-700",
  client:   "bg-blue-50 text-blue-700",
  internal: "bg-slate-100 text-slate-600",
};

const TYPE_LABELS: Record<string, string> = {
  dha: "DHA", document: "Document", client: "Client", internal: "Internal",
};

function daysFromToday(dateStr: string): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return differenceInCalendarDays(parseISO(dateStr), todayStart);
}

function DaysChip({ days }: { days: number }) {
  if (days < 0)
    return <span className="text-xs font-semibold text-red-600 tabular-nums whitespace-nowrap">{Math.abs(days)}d overdue</span>;
  if (days === 0)
    return <span className="text-xs font-semibold text-red-600 whitespace-nowrap">Today</span>;
  if (days <= 3)
    return <span className="text-xs font-semibold text-red-500 tabular-nums whitespace-nowrap">{days}d left</span>;
  if (days <= 7)
    return <span className="text-xs font-medium text-amber-600 tabular-nums whitespace-nowrap">{days}d left</span>;
  return <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">{days}d left</span>;
}

export function CaseDeadlines({
  caseId,
  onAddDeadline,
}: {
  caseId: string;
  onAddDeadline: () => void;
}) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const fetchDeadlines = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/cases/${caseId}/deadlines`);
    if (res.ok) {
      const json = await res.json();
      setDeadlines(json.deadlines ?? []);
    }
    setLoading(false);
  }, [caseId]);

  useEffect(() => { fetchDeadlines(); }, [fetchDeadlines]);

  const markComplete = async (id: string) => {
    setCompleting(id);
    setDeadlines((prev) => prev.map((d) => d.id === id ? { ...d, is_complete: true } : d));
    const res = await fetch(`/api/deadlines/${id}/complete`, { method: "PATCH" });
    if (!res.ok) {
      // revert
      setDeadlines((prev) => prev.map((d) => d.id === id ? { ...d, is_complete: false } : d));
    }
    setCompleting(null);
  };

  const upcoming = deadlines.filter((d) => !d.is_complete);
  const completed = deadlines.filter((d) => d.is_complete);

  return (
    <div className="bg-white border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Deadlines</h3>
          {upcoming.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {upcoming.length} upcoming
            </span>
          )}
        </div>
        <button
          onClick={onAddDeadline}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {loading ? (
        <div className="px-5 py-6 text-xs text-slate-400">Loading…</div>
      ) : deadlines.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-400">
          <CalendarX className="h-6 w-6" />
          <p className="text-xs">No deadlines for this case.</p>
          <button
            onClick={onAddDeadline}
            className="mt-1 flex items-center gap-1 border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Deadline
          </button>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((d) => {
                const days = daysFromToday(d.deadline_date);
                return (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                    {/* Days chip */}
                    <div className="w-16 shrink-0 text-right">
                      <DaysChip days={days} />
                    </div>

                    {/* Detail */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{d.label}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {format(parseISO(d.deadline_date), "EEE d MMM yyyy")}
                        </span>
                        {d.deadline_type && (
                          <span className={cn(
                            "inline-block px-1.5 py-px text-xs font-medium",
                            TYPE_STYLES[d.deadline_type] ?? "bg-slate-100 text-slate-600"
                          )}>
                            {TYPE_LABELS[d.deadline_type] ?? d.deadline_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mark complete */}
                    <button
                      onClick={() => markComplete(d.id)}
                      disabled={completing === d.id}
                      className="flex shrink-0 items-center gap-1 border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:border-green-300 hover:text-green-600 disabled:opacity-40 transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      {completing === d.id ? "Saving…" : "Done"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Completed (collapsed summary) */}
          {completed.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-2.5">
              <p className="text-xs text-slate-400">{completed.length} completed deadline{completed.length !== 1 ? "s" : ""}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
