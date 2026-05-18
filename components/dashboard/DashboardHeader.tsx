"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":           "Dashboard",
  "/dashboard/cases":     "Cases",
  "/dashboard/pipeline":  "Pipeline",
  "/dashboard/deadlines": "Deadlines",
  "/dashboard/clients":   "Clients",
  "/dashboard/trust":     "Trust Account",
  "/dashboard/settings":  "Settings",
};

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Match /dashboard/cases/[id] → "Cases", etc.
  const segment = "/" + pathname.split("/").slice(1, 3).join("/");
  return PAGE_TITLES[segment] ?? "VisaDesk";
}

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-sm font-semibold text-slate-800">{title}</h1>
      <span className="text-sm text-slate-500">{userName}</span>
    </header>
  );
}
