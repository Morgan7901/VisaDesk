"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Building2, Loader2, X, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SponsorRow {
  id: string;
  company_name: string;
  abn: string | null;
  contact_name: string | null;
  contact_email: string | null;
  sbs_status: string | null;
  sbs_expiry: string | null;
  portal_active: boolean;
  case_count: number;
}

interface Props {
  sponsors: SponsorRow[];
}

const SBS_FILTERS = [
  { value: "", label: "All" },
  { value: "not_applied", label: "Not Applied" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "expired", label: "Expired" },
];

const SBS_BADGE: Record<string, string> = {
  not_applied: "bg-slate-100 text-slate-500 border-slate-200",
  pending:     "bg-amber-50 text-amber-700 border-amber-200",
  approved:    "bg-green-50 text-green-700 border-green-200",
  expired:     "bg-red-50 text-red-700 border-red-200",
};

function SbsBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 border bg-slate-100 text-slate-500 border-slate-200">
        Not Applied
      </span>
    );
  }
  const cls = SBS_BADGE[status] ?? "bg-slate-100 text-slate-500 border-slate-200";
  const label = status === "not_applied"
    ? "Not Applied"
    : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 border", cls)}>
      {label}
    </span>
  );
}

interface NewSponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function NewSponsorModal({ isOpen, onClose }: NewSponsorModalProps) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [abn, setAbn] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCompanyName(""); setAbn(""); setContactName("");
    setContactEmail(""); setContactPhone(""); setError(null); setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) { setError("Company name is required."); return; }
    setError(null);
    setSaving(true);
    const res = await fetch("/api/sponsors/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName.trim(),
        abn: abn.trim() || undefined,
        contact_name: contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      setError(data.error ?? "Failed to create sponsor.");
      setSaving(false);
      return;
    }
    router.refresh();
    handleClose();
  };

  if (!isOpen) return null;

  const inputCls = "w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">New Sponsor</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="Acme Pty Ltd"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">ABN</label>
            <input
              type="text"
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              placeholder="12 345 678 901"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Smith"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="hr@acme.com"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Contact Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+61 2 xxxx xxxx"
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#0f172a] px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Creating…" : "Create Sponsor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SponsorsPage({ sponsors }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sbsFilter, setSbsFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sponsors.filter((s) => {
      const matchSearch =
        !q ||
        s.company_name.toLowerCase().includes(q) ||
        (s.contact_name ?? "").toLowerCase().includes(q) ||
        (s.abn ?? "").toLowerCase().includes(q);
      const matchSbs =
        !sbsFilter ||
        (sbsFilter === "not_applied" && (!s.sbs_status || s.sbs_status === "not_applied")) ||
        (sbsFilter !== "not_applied" && s.sbs_status === sbsFilter);
      return matchSearch && matchSbs;
    });
  }, [sponsors, search, sbsFilter]);

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
              placeholder="Search by company, contact, or ABN…"
              className="w-full border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="flex items-center gap-1">
            {SBS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setSbsFilter(f.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium border transition-colors",
                  sbsFilter === f.value
                    ? "bg-[#0f172a] text-white border-[#0f172a]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="ml-auto flex items-center gap-1.5 bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Sponsor
          </button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Building2 className="h-8 w-8" />
            <p className="text-sm">
              {sponsors.length === 0
                ? "No sponsors yet. Add your first sponsor."
                : "No sponsors match your filters."}
            </p>
            {sponsors.length === 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-1 flex items-center gap-1.5 bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Sponsor
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {["Company Name", "ABN", "Contact", "SBS Status", "Cases", ""].map((h) => (
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
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="font-medium text-slate-800 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/dashboard/sponsors/${s.id}`)}
                        className="block px-5 py-3 text-left hover:underline"
                      >
                        {s.company_name}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {s.abn ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {s.contact_name ? (
                        <div>
                          <p className="text-sm text-slate-700">{s.contact_name}</p>
                          {s.contact_email && (
                            <p className="text-xs text-slate-400">{s.contact_email}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <SbsBadge status={s.sbs_status} />
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {s.case_count > 0 ? (
                        <span className="inline-block bg-[#0f172a] px-2 py-0.5 text-xs font-medium text-white">
                          {s.case_count}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">0</span>
                      )}
                    </td>
                    <td className="pr-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/dashboard/sponsors/${s.id}`)}
                        className="text-sm font-medium text-slate-600 hover:underline"
                      >
                        View
                      </button>
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
              {filtered.length} of {sponsors.length} sponsor{sponsors.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      <NewSponsorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
