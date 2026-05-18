import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export interface RecentCaseRow {
  id: string;
  ref_number: string | null;
  visa_subclass: string;
  status: string;
  updated_at: string;
  clients: { full_name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-blue-50 text-blue-700",
  granted:   "bg-green-50 text-green-700",
  refused:   "bg-red-50 text-red-700",
  withdrawn: "bg-slate-100 text-slate-600",
  closed:    "bg-slate-100 text-slate-600",
};

function statusBadge(status: string) {
  return cn(
    "inline-block px-2 py-0.5 text-xs font-medium capitalize",
    STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"
  );
}

interface RecentCasesProps {
  cases: RecentCaseRow[];
}

export function RecentCases({ cases }: RecentCasesProps) {
  return (
    <div className="bg-white border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-800">Recent Cases</h2>
        <Link
          href="/dashboard/cases"
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {cases.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-400">
          No cases yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Ref #
                </th>
                <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Client
                </th>
                <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Visa
                </th>
                <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Status
                </th>
                <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Updated
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((c) => (
                <tr key={c.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">
                    {c.ref_number ?? "—"}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {c.clients?.full_name ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-block bg-[#0f172a] px-2 py-0.5 text-xs font-medium text-white">
                      SC-{c.visa_subclass}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={statusBadge(c.status)}>{c.status}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {formatDistanceToNow(parseISO(c.updated_at), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="pr-4 text-right">
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
