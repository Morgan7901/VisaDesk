"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Workflow",       suffix: "" },
  { label: "Documents",      suffix: "/documents" },
  { label: "Communications", suffix: "/comms" },
  { label: "Trust",          suffix: "/trust" },
];

export function CaseTabs({ caseId }: { caseId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/cases/${caseId}`;

  return (
    <div className="border-b border-slate-200 bg-white px-6">
      <nav className="-mb-px flex gap-0">
        {TABS.map(({ label, suffix }) => {
          const href = `${base}${suffix}`;
          const isActive =
            suffix === ""
              ? pathname === base
              : pathname.startsWith(href);

          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "border-b-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "border-[#0f172a] text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
