"use client";

import { useState } from "react";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CheckCheck, CalendarX } from "lucide-react";

export interface DeadlineRow {
  id: string;
  label: string;
  deadline_date: string;
  deadline_type: string | null;
  cases: {
    ref_number: string | null;
    clients: { full_name: string } | null;
  } | null;
}

interface DeadlinePanelProps {
  initialDeadlines: DeadlineRow[];
}

function daysLabel(deadline_date: string) {
  const days = differenceInDays(
    parseISO(deadline_date),
    startOfDay(new Date())
  );
  if (days < 0) return { label: "Overdue", cls: "text-red-600 font-semibold" };
  if (days === 0) return { label: "Today", cls: "text-red-600 font-semibold" };
  if (days <= 3) return { label: `${days}d`, cls: "text-red-500 font-medium" };
  if (days <= 7) return { label: `${days}d`, cls: "text-amber-600 font-medium" };
  return { label: `${days}d`, cls: "text-green-600 font-medium" };
}

export function DeadlinePanel({ initialDeadlines }: DeadlinePanelProps) {
  const [deadlines, setDeadlines] = useState(initialDeadlines);
  const [completing, setCompleting] = useState<string | null>(null);

  const markComplete = async (id: string) => {
    setCompleting(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("deadlines")
      .update({ is_complete: true })
      .eq("id", id);
    if (!error) {
      setDeadlines((prev) => prev.filter((d) => d.id !== id));
    }
    setCompleting(null);
  };

  return (
    <div className="bg-white border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-800">
          Deadlines — Next 14 Days
        </h2>
        <span className="text-xs text-slate-400">{deadlines.length} pending</span>
      </div>

      {deadlines.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
          <CalendarX className="h-7 w-7" />
          <p className="text-sm">No upcoming deadlines</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {deadlines.map((d) => {
            const { label, cls } = daysLabel(d.deadline_date);
            const ref = d.cases?.ref_number ?? "—";
            const client = d.cases?.clients?.full_name ?? "Unknown client";

            return (
              <li key={d.id} className="flex items-center gap-4 px-5 py-3.5">
                {/* Days badge */}
                <span className={cn("w-14 shrink-0 text-right text-sm tabular-nums", cls)}>
                  {label}
                </span>

                {/* Detail */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {d.label}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {ref} · {client}
                  </p>
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
    </div>
  );
}
