"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabDef {
  label: string;
  suffix: string;
  badge?: number;
  icon?: React.ReactNode;
}

export function CaseTabs({
  caseId,
  commCount,
}: {
  caseId: string;
  commCount?: number;
}) {
  const pathname = usePathname();
  const base = `/dashboard/cases/${caseId}`;

  const TABS: TabDef[] = [
    { label: "Overview",       suffix: "" },
    { label: "Workflow",       suffix: "/workflow" },
    { label: "Documents",      suffix: "/documents" },
    { label: "Communications", suffix: "/comms", badge: commCount },
    { label: "Trust",          suffix: "/trust" },
    { label: "AI Tools",       suffix: "/ai", icon: <Sparkles className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="border-b border-slate-200 bg-white px-6">
      <nav className="-mb-px flex gap-0">
        {TABS.map(({ label, suffix, badge, icon }) => {
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
                "flex items-center gap-1.5 border-b-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "border-[#0f172a] text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
              )}
            >
              {icon && icon}
              {label}
              {typeof badge === "number" && badge > 0 && (
                <span
                  className={cn(
                    "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-600"
                  )}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
