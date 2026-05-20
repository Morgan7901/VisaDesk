"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CheckCheck, AlertCircle, ArrowLeft, Plus, Loader2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewCaseModal } from "@/components/cases/NewCaseModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SponsorDetail {
  id: string;
  company_name: string;
  abn: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  sbs_status: string | null;
  sbs_expiry: string | null;
  portal_token: string | null;
  portal_active: boolean;
  created_at: string;
}

export interface SponsorCase {
  id: string;
  ref_number: string | null;
  visa_subclass: string;
  status: string;
  client_name: string | null;
  current_stage_label: string | null;
  created_at: string;
}

interface Props {
  sponsor: SponsorDetail;
  cases: SponsorCase[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-blue-50 text-blue-700",
  submitted: "bg-amber-50 text-amber-700",
  granted:   "bg-green-50 text-green-700",
  refused:   "bg-red-50 text-red-700",
  withdrawn: "bg-slate-100 text-slate-500",
};

const SBS_STATUSES = [
  { value: "not_applied", label: "Not Applied" },
  { value: "pending",     label: "Pending" },
  { value: "approved",    label: "Approved" },
  { value: "expired",     label: "Expired" },
];

// ─── Sponsor Details Form ─────────────────────────────────────────────────────

function SponsorDetailsCard({ sponsor: initial }: { sponsor: SponsorDetail }) {
  const [sponsor, setSponsor] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const portalUrl = sponsor.portal_token
    ? `${appUrl}/portal/sponsor/${sponsor.portal_token}`
    : null;

  const handleCopyPortalUrl = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const toStr = (key: string) => (fd.get(key) as string | null)?.trim() || null;

    const updates = {
      company_name:  toStr("company_name") ?? sponsor.company_name,
      abn:           toStr("abn"),
      contact_name:  toStr("contact_name"),
      contact_email: toStr("contact_email"),
      contact_phone: toStr("contact_phone"),
      sbs_status:    toStr("sbs_status"),
      sbs_expiry:    sponsor.sbs_status === "approved" ? toStr("sbs_expiry") : null,
      portal_active: sponsor.portal_active,
    };

    setSaving(true);
    const res = await fetch(`/api/sponsors/${sponsor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      setSponsor((prev) => ({ ...prev, ...updates }));
      showToast("Sponsor saved.", true);
    } else {
      const json = await res.json().catch(() => ({}));
      showToast(json.error ?? "Failed to save.", false);
    }
    setSaving(false);
  };

  const togglePortal = async () => {
    const newVal = !sponsor.portal_active;
    setSponsor((prev) => ({ ...prev, portal_active: newVal }));
    const res = await fetch(`/api/sponsors/${sponsor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portal_active: newVal }),
    });
    if (!res.ok) {
      setSponsor((prev) => ({ ...prev, portal_active: !newVal }));
      showToast("Failed to update portal status.", false);
    } else {
      showToast(`Portal ${newVal ? "activated" : "deactivated"}.`, true);
    }
  };

  const inputCls = "w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400";

  return (
    <>
      <div className="bg-white border border-slate-200">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">Sponsor Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Company Name</label>
            <input name="company_name" type="text" defaultValue={sponsor.company_name} required className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">ABN</label>
            <input name="abn" type="text" defaultValue={sponsor.abn ?? ""} placeholder="12 345 678 901" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Contact Name</label>
              <input name="contact_name" type="text" defaultValue={sponsor.contact_name ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Contact Email</label>
              <input name="contact_email" type="email" defaultValue={sponsor.contact_email ?? ""} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Contact Phone</label>
            <input name="contact_phone" type="tel" defaultValue={sponsor.contact_phone ?? ""} className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">SBS Status</label>
            <select
              name="sbs_status"
              value={sponsor.sbs_status ?? "not_applied"}
              onChange={(e) => setSponsor((prev) => ({ ...prev, sbs_status: e.target.value }))}
              className={inputCls}
            >
              {SBS_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {sponsor.sbs_status === "approved" && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">SBS Expiry</label>
              <input
                name="sbs_expiry"
                type="date"
                defaultValue={sponsor.sbs_expiry ?? ""}
                className={inputCls}
              />
            </div>
          )}

          {/* Portal status toggle */}
          <div className="flex items-center justify-between border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Portal Access</p>
              <p className="text-xs text-slate-400">
                {sponsor.portal_active ? "Sponsor can log into the portal." : "Portal access is disabled."}
              </p>
            </div>
            <button
              type="button"
              onClick={togglePortal}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
                sponsor.portal_active ? "bg-green-500" : "bg-slate-200"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform",
                  sponsor.portal_active ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Portal URL */}
          {portalUrl && (
            <div className="border border-slate-200 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Portal URL</p>
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 border",
                  sponsor.portal_active
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                )}>
                  {sponsor.portal_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5">
                  {portalUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPortalUrl}
                  className="shrink-0 flex items-center gap-1.5 border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400 hover:text-slate-800 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#0f172a] px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-lg",
          toast.ok ? "bg-[#0f172a]" : "bg-red-600"
        )}>
          {toast.ok
            ? <CheckCheck className="h-4 w-4 text-green-400" />
            : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
    </>
  );
}

// ─── Cases Card ───────────────────────────────────────────────────────────────

function CasesCard({ sponsorId, cases }: { sponsorId: string; cases: SponsorCase[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">
            Linked Cases
            <span className="ml-2 text-xs font-normal text-slate-400">({cases.length})</span>
          </h2>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Case
          </button>
        </div>

        {cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
            <p className="text-sm">No cases linked to this sponsor.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Create First Case
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cases.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`/dashboard/cases/${c.id}`}
                      className="font-mono text-sm font-semibold text-slate-800 hover:underline"
                    >
                      {c.ref_number ?? "—"}
                    </a>
                    <span className="inline-block bg-[#0f172a] px-2 py-0.5 text-xs font-medium text-white">
                      SC-{c.visa_subclass}
                    </span>
                    <span className={cn(
                      "inline-block px-2 py-0.5 text-xs font-medium capitalize",
                      STATUS_STYLES[c.status] ?? "bg-slate-100 text-slate-500"
                    )}>
                      {c.status}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    {c.client_name && <span>{c.client_name}</span>}
                    {c.current_stage_label && <span>{c.current_stage_label}</span>}
                    <span>Created {format(parseISO(c.created_at), "d MMM yyyy")}</span>
                  </div>
                </div>
                <a
                  href={`/dashboard/cases/${c.id}`}
                  className="shrink-0 text-xs text-slate-500 hover:underline"
                >
                  View →
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <NewCaseModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          prefillSponsorId={sponsorId}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SponsorProfilePage({ sponsor, cases }: Props) {
  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <a
          href="/dashboard/sponsors"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Sponsors
        </a>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-800">{sponsor.company_name}</span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <SponsorDetailsCard sponsor={sponsor} />
        </div>
        <div className="xl:col-span-3">
          <CasesCard sponsorId={sponsor.id} cases={cases} />
        </div>
      </div>
    </div>
  );
}
