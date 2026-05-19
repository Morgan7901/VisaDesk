"use client";

import { useState, useMemo } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { Search, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewClientModal } from "@/components/clients/NewClientModal";

export interface ClientRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  passport_expiry: string | null;
  portal_active: boolean;
  case_count: number;
}

interface Props {
  clients: ClientRow[];
}

function PassportExpiryCell({ expiry }: { expiry: string | null }) {
  if (!expiry) return <span className="text-slate-400">—</span>;
  const days = differenceInCalendarDays(parseISO(expiry), new Date());
  const formatted = format(parseISO(expiry), "dd/MM/yyyy");
  const urgent = days < 90;
  return (
    <span className={cn("text-sm", urgent ? "font-medium text-red-600" : "text-slate-600")}>
      {formatted}
      {urgent && (
        <span className="ml-1.5 text-xs">
          {days < 0 ? "(expired)" : `(${days}d)`}
        </span>
      )}
    </span>
  );
}

function PortalBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-block px-2 py-0.5 text-xs font-medium",
      active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
    )}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function ClientsPage({ clients }: Props) {
  const [search, setSearch] = useState("");
  const [portalFilter, setPortalFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter((c) => {
      const matchSearch =
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.nationality ?? "").toLowerCase().includes(q);
      const matchPortal =
        !portalFilter ||
        (portalFilter === "active" && c.portal_active) ||
        (portalFilter === "inactive" && !c.portal_active);
      return matchSearch && matchPortal;
    });
  }, [clients, search, portalFilter]);

  const selectCls =
    "border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <>
      <div className="bg-white border border-slate-200">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or nationality…"
              className="w-full border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <select
            value={portalFilter}
            onChange={(e) => setPortalFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">All portal statuses</option>
            <option value="active">Portal Active</option>
            <option value="inactive">Portal Inactive</option>
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="ml-auto flex items-center gap-1.5 bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Client
          </button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Users className="h-8 w-8" />
            <p className="text-sm">
              {clients.length === 0
                ? "No clients yet. Add your first client."
                : "No clients match your filters."}
            </p>
            {clients.length === 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-1 flex items-center gap-1.5 bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Client
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {["Name", "Email", "Phone", "Nationality", "Passport Expiry", "Cases", "Portal", ""].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-400 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="font-medium text-slate-800 whitespace-nowrap">
                      <a href={`/dashboard/clients/${c.id}`} className="block px-5 py-3 hover:underline">
                        {c.full_name}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {c.email ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {c.phone ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {c.nationality ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <PassportExpiryCell expiry={c.passport_expiry} />
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {c.case_count > 0 ? (
                        <span className="inline-block bg-[#0f172a] px-2 py-0.5 text-xs font-medium text-white">
                          {c.case_count}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <PortalBadge active={c.portal_active} />
                    </td>
                    <td className="pr-4 text-right whitespace-nowrap">
                      <a
                        href={`/dashboard/clients/${c.id}`}
                        className="text-sm font-medium text-slate-600 hover:underline"
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

        {filtered.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-2.5">
            <p className="text-xs text-slate-400">
              {filtered.length} of {clients.length} client{clients.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      <NewClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(id) => { window.location.href = `/dashboard/clients/${id}`; }}
      />
    </>
  );
}
