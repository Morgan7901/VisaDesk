"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  GitBranch,
  CalendarClock,
  Users,
  Landmark,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { canAccess } from "@/lib/permissions";

const ALL_NAV = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard",          resource: null },
  { label: "Cases",     icon: Briefcase,       href: "/dashboard/cases",    resource: null },
  { label: "Pipeline",  icon: GitBranch,       href: "/dashboard/pipeline", resource: "pipeline" as const },
  { label: "Deadlines", icon: CalendarClock,   href: "/dashboard/deadlines",resource: null },
  { label: "Clients",   icon: Users,           href: "/dashboard/clients",  resource: null },
  { label: "Trust",     icon: Landmark,        href: "/dashboard/trust",    resource: "trust" as const },
  { label: "Settings",  icon: Settings,        href: "/dashboard/settings", resource: "settings" as const },
];

interface SidebarProps {
  userName: string;
  userEmail: string;
  role: string;
}

export function Sidebar({ userName, userEmail, role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const visibleNav = ALL_NAV.filter(({ resource }) => {
    if (!resource) return true;
    return canAccess(role, resource, "view");
  });

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-[#0f172a]">
      {/* Logo */}
      <div className="flex h-14 items-center px-5 border-b border-slate-800">
        <span className="text-lg font-bold tracking-tight text-white select-none">
          Visa<span className="text-blue-400">Desk</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleNav.map(({ label, icon: Icon, href }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-none px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-800 px-4 py-4">
        <div className="mb-3 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-200">
              {userName || "Agent"}
            </p>
            {role !== "firm_admin" && (
              <span className="shrink-0 rounded-sm bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium capitalize text-slate-300">
                {role}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-500">{userEmail}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 px-2 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
