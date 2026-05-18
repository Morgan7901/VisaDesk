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

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Cases",     icon: Briefcase,       href: "/dashboard/cases" },
  { label: "Pipeline",  icon: GitBranch,       href: "/dashboard/pipeline" },
  { label: "Deadlines", icon: CalendarClock,   href: "/dashboard/deadlines" },
  { label: "Clients",   icon: Users,           href: "/dashboard/clients" },
  { label: "Trust",     icon: Landmark,        href: "/dashboard/trust" },
  { label: "Settings",  icon: Settings,        href: "/dashboard/settings" },
];

interface SidebarProps {
  userName: string;
  userEmail: string;
}

export function Sidebar({ userName, userEmail }: SidebarProps) {
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
        {NAV.map(({ label, icon: Icon, href }) => (
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
          <p className="truncate text-sm font-medium text-slate-200">
            {userName || "Agent"}
          </p>
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
