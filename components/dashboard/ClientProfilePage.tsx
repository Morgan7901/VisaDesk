"use client";

import { useState } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { CheckCheck, AlertCircle, ArrowLeft, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewCaseModal } from "@/components/cases/NewCaseModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientDetail {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  portal_active: boolean;
  created_at: string;
}

export interface ClientCase {
  id: string;
  ref_number: string | null;
  visa_subclass: string;
  status: string;
  current_stage_label: string | null;
  created_at: string;
}

interface Props {
  client: ClientDetail;
  cases: ClientCase[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-blue-50 text-blue-700",
  submitted: "bg-amber-50 text-amber-700",
  granted:   "bg-green-50 text-green-700",
  refused:   "bg-red-50 text-red-700",
  withdrawn: "bg-slate-100 text-slate-500",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function passportExpiryClass(expiry: string | null): string {
  if (!expiry) return "";
  const days = differenceInCalendarDays(parseISO(expiry), new Date());
  return days < 90 ? "text-red-600 font-medium" : "text-slate-800";
}

// ─── Client Details Form ──────────────────────────────────────────────────────

function ClientDetailsCard({ client: initial }: { client: ClientDetail }) {
  const [client, setClient] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const toStr = (key: string) => (fd.get(key) as string | null)?.trim() || null;

    const updates = {
      full_name:       toStr("full_name") ?? client.full_name,
      email:           toStr("email"),
      phone:           toStr("phone"),
      date_of_birth:   toStr("date_of_birth"),
      nationality:     toStr("nationality"),
      passport_number: toStr("passport_number"),
      passport_expiry: toStr("passport_expiry"),
      portal_active:   client.portal_active,
    };

    setSaving(true);
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      setClient((prev) => ({ ...prev, ...updates }));
      showToast("Client saved.", true);
    } else {
      const json = await res.json().catch(() => ({}));
      showToast(json.error ?? "Failed to save.", false);
    }
    setSaving(false);
  };

  const togglePortal = async () => {
    const newVal = !client.portal_active;
    setClient((prev) => ({ ...prev, portal_active: newVal }));
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portal_active: newVal }),
    });
    if (!res.ok) {
      setClient((prev) => ({ ...prev, portal_active: !newVal }));
      showToast("Failed to update portal status.", false);
    } else {
      showToast(`Portal ${newVal ? "activated" : "deactivated"}.`, true);
    }
  };

  const inputCls = "w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400";
  const expiryClass = passportExpiryClass(client.passport_expiry);

  return (
    <>
      <div className="bg-white border border-slate-200">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">Client Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Full Name</label>
            <input name="full_name" type="text" defaultValue={client.full_name} required className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Email</label>
              <input name="email" type="email" defaultValue={client.email ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Phone</label>
              <input name="phone" type="tel" defaultValue={client.phone ?? ""} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Date of Birth</label>
              <input name="date_of_birth" type="date" defaultValue={client.date_of_birth ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Nationality</label>
              <input name="nationality" type="text" defaultValue={client.nationality ?? ""} placeholder="e.g. Chinese" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Passport Number</label>
              <input name="passport_number" type="text" defaultValue={client.passport_number ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Passport Expiry
              </label>
              <input
                name="passport_expiry"
                type="date"
                defaultValue={client.passport_expiry ?? ""}
                className={cn(inputCls, expiryClass ? "border-red-300 text-red-600" : "")}
              />
              {client.passport_expiry && passportExpiryClass(client.passport_expiry) && (
                <p className="mt-1 text-xs text-red-600">
                  {differenceInCalendarDays(parseISO(client.passport_expiry), new Date()) < 0
                    ? "Expired"
                    : `Expires in ${differenceInCalendarDays(parseISO(client.passport_expiry), new Date())} days`}
                </p>
              )}
            </div>
          </div>

          {/* Portal status toggle */}
          <div className="flex items-center justify-between border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Portal Access</p>
              <p className="text-xs text-slate-400">
                {client.portal_active ? "Client can log into the portal." : "Portal access is disabled."}
              </p>
            </div>
            <button
              type="button"
              onClick={togglePortal}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
                client.portal_active ? "bg-green-500" : "bg-slate-200"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform",
                  client.portal_active ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

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

function CasesCard({ clientId, cases }: { clientId: string; cases: ClientCase[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">
            Cases
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
            <p className="text-sm">No cases yet.</p>
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
                  <div className="flex items-center gap-2">
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

      {/* NewCaseModal with client pre-selected */}
      {modalOpen && (
        <NewCaseModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          prefillClientId={clientId}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ClientProfilePage({ client, cases }: Props) {
  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <a
          href="/dashboard/clients"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Clients
        </a>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-800">{client.full_name}</span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <ClientDetailsCard client={client} />
        </div>
        <div className="xl:col-span-3">
          <CasesCard clientId={client.id} cases={cases} />
        </div>
      </div>
    </div>
  );
}
