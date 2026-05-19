"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  UserPlus,
  Mail,
  Clock,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  suspended: boolean;
  avatar_url: string | null;
}

export interface PendingInvitation {
  id: string;
  token: string;
  email: string;
  role: string;
  sent_at: string;
  expires_at: string;
}

interface Props {
  initialMembers: TeamMember[];
  initialInvitations: PendingInvitation[];
  currentUserId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  firm_admin: "bg-violet-50 text-violet-700",
  agent:      "bg-blue-50 text-blue-700",
  finance:    "bg-green-50 text-green-700",
  staff:      "bg-slate-100 text-slate-600",
};

const ROLE_LABELS: Record<string, string> = {
  firm_admin: "Admin",
  agent:      "Agent",
  finance:    "Finance",
  staff:      "Staff",
};

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-sm border px-3 py-2 text-sm",
      type === "success"
        ? "border-green-200 bg-green-50 text-green-800"
        : "border-red-200 bg-red-50 text-red-800"
    )}>
      {type === "success"
        ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
        : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
      {message}
    </div>
  );
}

// ─── Invite Modal ────────────────────────────────────────────────────────────────

function InviteModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: (inv: PendingInvitation) => void;
}) {
  const [email, setEmail]   = useState("");
  const [role, setRole]     = useState("agent");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to send invitation.");
      setSaving(false);
      return;
    }
    onInvited(json.invitation);
    onClose();
  };

  const inputCls = "w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Invite Team Member</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && <Toast message={error} type="error" />}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Role *</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              <option value="agent">Agent — full case management</option>
              <option value="finance">Finance — trust &amp; billing access</option>
              <option value="staff">Staff — communications &amp; case view</option>
            </select>
          </div>

          <p className="text-xs text-slate-400">
            An invitation email will be sent with a link to create their account.
            The link expires in 7 days.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {saving ? "Sending…" : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main TeamSettings ────────────────────────────────────────────────────────────

export function TeamSettings({ initialMembers, initialInvitations, currentUserId }: Props) {
  const [members, setMembers]         = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [modalOpen, setModalOpen]     = useState(false);
  const [toast, setToast]             = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [loadingId, setLoadingId]     = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setLoadingId(memberId);
    const res = await fetch(`/api/team/members/${memberId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      showToast("Role updated.", "success");
    } else {
      showToast(json.error ?? "Failed to update role.", "error");
    }
    setLoadingId(null);
  };

  const handleSuspendToggle = async (memberId: string, currentSuspended: boolean) => {
    setLoadingId(memberId);
    const newSuspended = !currentSuspended;
    const res = await fetch(`/api/team/members/${memberId}/suspend`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended: newSuspended }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, suspended: newSuspended } : m))
      );
      showToast(
        newSuspended ? "Account suspended." : "Account reactivated.",
        "success"
      );
    } else {
      showToast(json.error ?? "Failed to update suspension.", "error");
    }
    setLoadingId(null);
  };

  const handleCancelInvite = async (token: string) => {
    if (!confirm("Cancel this invitation?")) return;
    const res = await fetch(`/api/team/invite/${token}/cancel`, { method: "DELETE" });
    if (res.ok) {
      setInvitations((prev) => prev.filter((i) => i.token !== token));
      showToast("Invitation cancelled.", "success");
    } else {
      const json = await res.json().catch(() => ({}));
      showToast(json.error ?? "Failed to cancel invitation.", "error");
    }
  };

  const handleResendInvite = async (inv: PendingInvitation) => {
    // Cancel old, create new
    await fetch(`/api/team/invite/${inv.token}/cancel`, { method: "DELETE" });
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inv.email, role: inv.role }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setInvitations((prev) =>
        prev
          .filter((i) => i.token !== inv.token)
          .concat(json.invitation)
      );
      showToast("Invitation resent.", "success");
    } else {
      showToast(json.error ?? "Failed to resend invitation.", "error");
    }
  };

  const selectCls = "border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none";

  return (
    <>
      <div className="space-y-8 max-w-2xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Team
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#0f172a] px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite Team Member
          </button>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} />}

        {/* Members list */}
        <div className="space-y-2">
          {members.map((member) => {
            const isSelf    = member.id === currentUserId;
            const isLoading = loadingId === member.id;
            const initials  = (member.full_name ?? member.email ?? "?")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={member.id}
                className={cn(
                  "flex items-center gap-4 border border-slate-200 bg-white px-4 py-3",
                  member.suspended && "opacity-60"
                )}
              >
                {/* Avatar */}
                <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-slate-200 flex items-center justify-center">
                  {member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatar_url} alt={initials} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-slate-600">{initials}</span>
                  )}
                </div>

                {/* Name + email */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {member.full_name ?? "—"}
                      {isSelf && (
                        <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>
                      )}
                    </p>
                    {member.suspended && (
                      <span className="rounded-sm bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-400">{member.email ?? "—"}</p>
                </div>

                {/* Role badge / dropdown */}
                {isSelf ? (
                  <span className={cn(
                    "rounded-sm px-2 py-0.5 text-xs font-semibold",
                    ROLE_STYLES[member.role] ?? ROLE_STYLES.agent
                  )}>
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>
                ) : (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    disabled={isLoading}
                    className={selectCls}
                  >
                    <option value="firm_admin">Admin</option>
                    <option value="agent">Agent</option>
                    <option value="finance">Finance</option>
                    <option value="staff">Staff</option>
                  </select>
                )}

                {/* Suspend toggle */}
                {!isSelf && (
                  <button
                    onClick={() => handleSuspendToggle(member.id, member.suspended)}
                    disabled={isLoading}
                    className={cn(
                      "flex-shrink-0 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40",
                      member.suspended
                        ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        : "border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    )}
                  >
                    {isLoading ? "…" : member.suspended ? "Reactivate" : "Suspend"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Pending Invitations
            </p>
            {invitations.map((inv) => {
              const isExpired = new Date(inv.expires_at) < new Date();
              return (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 border border-dashed border-slate-300 bg-slate-50 px-4 py-3"
                >
                  <Mail className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        ROLE_STYLES[inv.role] ?? ROLE_STYLES.agent
                      )}>
                        {ROLE_LABELS[inv.role] ?? inv.role}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {isExpired
                          ? "Expired"
                          : `Expires ${format(parseISO(inv.expires_at), "d MMM")}`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResendInvite(inv)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                    title="Resend invitation"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Resend
                  </button>
                  <button
                    onClick={() => handleCancelInvite(inv.token)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title="Cancel invitation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {members.length === 0 && invitations.length === 0 && (
          <p className="text-sm text-slate-400 italic">
            No team members yet. Invite someone to get started.
          </p>
        )}
      </div>

      {modalOpen && (
        <InviteModal
          onClose={() => setModalOpen(false)}
          onInvited={(inv) => {
            setInvitations((prev) => [inv, ...prev]);
            setModalOpen(false);
            showToast("Invitation sent.", "success");
          }}
        />
      )}
    </>
  );
}
