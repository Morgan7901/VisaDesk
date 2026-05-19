"use client";

import { useCallback, useState } from "react";
import {
  Building2,
  User,
  GitBranch,
  Users,
  Save,
  Lock,
  Eye,
  EyeOff,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  CheckCircle,
  AlertCircle,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TeamSettings,
  type TeamMember,
  type PendingInvitation,
} from "@/components/settings/TeamSettings";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface FirmData {
  id: string;
  name: string;
  abn: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  plan: string;
}

export interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  mara_number: string | null;
  avatar_url: string | null;
}

export interface WorkflowTask {
  id: string | null;       // null = newly added, not yet saved
  label: string;
  is_required: boolean;
  task_order: number;
  stage_id: string;
}

export interface WorkflowStage {
  id: string;
  label: string;
  stage_order: number;
  tasks: WorkflowTask[];
}

export interface WorkflowTemplate {
  id: string;
  visa_subclass: string;
  label: string;
  stages: WorkflowStage[];
  stage_count: number;
  task_count: number;
}

export interface GlobalTemplate {
  visa_subclass: string;
  label: string;
}

interface Props {
  firm: FirmData | null;
  profile: ProfileData;
  templates: WorkflowTemplate[];
  globalTemplates: GlobalTemplate[];
  teamMembers?: TeamMember[];
  pendingInvitations?: PendingInvitation[];
  showTeam?: boolean;
}

type Section = "firm" | "profile" | "workflow" | "team";

// ─── Helpers ────────────────────────────────────────────────────────────────────

const inputCls =
  "w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-500";

const PLAN_STYLES: Record<string, string> = {
  starter:      "bg-slate-100 text-slate-700",
  professional: "bg-blue-50 text-blue-700",
  firm:         "bg-violet-50 text-violet-700",
};

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-sm border px-3 py-2 text-sm",
        type === "success"
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-red-200 bg-red-50 text-red-800"
      )}
    >
      {type === "success" ? (
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
      )}
      {message}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
      {children}
    </p>
  );
}

function FormRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ─── Firm Settings ───────────────────────────────────────────────────────────────

function FirmSettingsForm({
  initialFirm,
  onSaved,
}: {
  initialFirm: FirmData | null;
  onSaved?: (updated: FirmData) => void;
}) {
  const [firm, setFirm] = useState<FirmData>(
    initialFirm ?? {
      id: "",
      name: "",
      abn: null,
      address: null,
      phone: null,
      email: null,
      logo_url: null,
      plan: "starter",
    }
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const set = (field: keyof FirmData, value: string) =>
    setFirm((f) => ({ ...f, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings/firm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:        firm.name,
        abn:         firm.abn || null,
        address:     firm.address || null,
        phone:       firm.phone || null,
        email:       firm.email || null,
        logo_url:    firm.logo_url || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      // Update local form state with what the DB returned
      setFirm(json.firm);
      // Bubble up to parent so remounting this form gets the latest saved value
      onSaved?.(json.firm);
      showToast("Firm settings saved.", "success");
    } else {
      showToast(json.error ?? "Save failed.", "error");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-xl">
      <SectionLabel>Firm Settings</SectionLabel>

      {toast && <Toast message={toast.message} type={toast.type} />}

      <FormRow label="Firm Name *">
        <input
          type="text"
          value={firm.name}
          onChange={(e) => set("name", e.target.value)}
          className={inputCls}
          required
        />
      </FormRow>

      <FormRow label="ABN">
        <input
          type="text"
          value={firm.abn ?? ""}
          onChange={(e) => set("abn", e.target.value)}
          placeholder="12 345 678 901"
          className={inputCls}
        />
      </FormRow>

      <FormRow label="Address">
        <input
          type="text"
          value={firm.address ?? ""}
          onChange={(e) => set("address", e.target.value)}
          placeholder="123 Collins St, Melbourne VIC 3000"
          className={inputCls}
        />
      </FormRow>

      <div className="grid grid-cols-2 gap-4">
        <FormRow label="Phone">
          <input
            type="tel"
            value={firm.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+61 3 9000 0000"
            className={inputCls}
          />
        </FormRow>
        <FormRow label="Email">
          <input
            type="email"
            value={firm.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            placeholder="info@yourfirm.com.au"
            className={inputCls}
          />
        </FormRow>
      </div>

      <FormRow
        label="Logo URL"
        hint="Paste a direct URL to your logo image. Upload support coming soon."
      >
        {firm.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firm.logo_url}
            alt="Firm logo"
            className="mb-2 h-12 w-auto rounded border border-slate-200 object-contain p-1"
          />
        )}
        <input
          type="url"
          value={firm.logo_url ?? ""}
          onChange={(e) => set("logo_url", e.target.value)}
          placeholder="https://example.com/logo.png"
          className={inputCls}
        />
      </FormRow>

      <FormRow label="Plan">
        <div className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              "inline-block rounded-sm px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
              PLAN_STYLES[firm.plan] ?? PLAN_STYLES.starter
            )}
          >
            {firm.plan.charAt(0).toUpperCase() + firm.plan.slice(1)}
          </span>
          <span className="text-xs text-slate-400">
            Contact support to change your plan.
          </span>
        </div>
      </FormRow>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save Firm Settings"}
        </button>
      </div>
    </form>
  );
}

// ─── My Profile ──────────────────────────────────────────────────────────────────

function ProfileForm({
  initialProfile,
  onSaved,
}: {
  initialProfile: ProfileData;
  onSaved?: (updated: ProfileData) => void;
}) {
  const [prof, setProf] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Password state
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwToast, setPwToast]       = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const showPwToast = (message: string, type: "success" | "error") => {
    setPwToast({ message, type });
    setTimeout(() => setPwToast(null), 4000);
  };

  const set = (field: keyof ProfileData, value: string) =>
    setProf((p) => ({ ...p, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name:   prof.full_name || null,
        phone:       prof.phone || null,
        mara_number: prof.mara_number || null,
        avatar_url:  prof.avatar_url || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      // Update local form state with what the DB returned
      setProf((p) => ({ ...p, ...json.profile }));
      // Bubble up to parent so remounting this form gets the latest saved value
      onSaved?.({ ...prof, ...json.profile });
      showToast("Profile saved.", "success");
    } else {
      showToast(json.error ?? "Save failed.", "error");
    }
    setSaving(false);
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      showPwToast("New passwords do not match.", "error");
      return;
    }
    if (newPw.length < 8) {
      showPwToast("Password must be at least 8 characters.", "error");
      return;
    }
    setPwSaving(true);
    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      showPwToast("Password changed successfully.", "success");
    } else {
      showPwToast(json.error ?? "Password change failed.", "error");
    }
    setPwSaving(false);
  };

  const pwInputCls = cn(inputCls, "pr-10");

  return (
    <div className="space-y-10 max-w-xl">
      {/* Profile form */}
      <form onSubmit={handleSave} className="space-y-6">
        <SectionLabel>My Profile</SectionLabel>
        {toast && <Toast message={toast.message} type={toast.type} />}

        <FormRow label="Full Name">
          <input
            type="text"
            value={prof.full_name ?? ""}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Jane Smith"
            className={inputCls}
          />
        </FormRow>

        <FormRow
          label="Email"
          hint="Email is managed by Supabase Auth and cannot be changed here."
        >
          <input
            type="email"
            value={prof.email ?? ""}
            disabled
            className={inputCls}
          />
        </FormRow>

        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Phone">
            <input
              type="tel"
              value={prof.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+61 4 0000 0000"
              className={inputCls}
            />
          </FormRow>
          <FormRow label="MARA Number (Individual)">
            <input
              type="text"
              value={prof.mara_number ?? ""}
              onChange={(e) => set("mara_number", e.target.value)}
              placeholder="1234567"
              className={inputCls}
            />
          </FormRow>
        </div>

        <FormRow
          label="Avatar URL"
          hint="Paste a direct URL to your profile photo."
        >
          {prof.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={prof.avatar_url}
              alt="Avatar"
              className="mb-2 h-12 w-12 rounded-full border border-slate-200 object-cover"
            />
          )}
          <input
            type="url"
            value={prof.avatar_url ?? ""}
            onChange={(e) => set("avatar_url", e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className={inputCls}
          />
        </FormRow>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="border-t border-slate-200 pt-8">
        <form onSubmit={handlePassword} className="space-y-5">
          <SectionLabel>Change Password</SectionLabel>
          {pwToast && <Toast message={pwToast.message} type={pwToast.type} />}

          {[
            { label: "Current Password", value: currentPw, setter: setCurrentPw },
            { label: "New Password",     value: newPw,     setter: setNewPw },
            { label: "Confirm New Password", value: confirmPw, setter: setConfirmPw },
          ].map(({ label, value, setter }) => (
            <FormRow key={label} label={label}>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className={pwInputCls}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormRow>
          ))}

          <div className="pt-1">
            <button
              type="submit"
              disabled={pwSaving || !currentPw || !newPw || !confirmPw}
              className="flex items-center gap-2 border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              <Lock className="h-4 w-4" />
              {pwSaving ? "Updating…" : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Workflow Edit Modal ──────────────────────────────────────────────────────────

let _newTaskCounter = 0;
function newTaskId() {
  return `_new_${++_newTaskCounter}`;
}

function WorkflowEditModal({
  template,
  onClose,
  onSaved,
}: {
  template: WorkflowTemplate;
  onClose: () => void;
  onSaved: (updated: WorkflowTemplate) => void;
}) {
  // Deep-clone to avoid mutating props
  const [stages, setStages] = useState<WorkflowStage[]>(() =>
    template.stages.map((s) => ({
      ...s,
      tasks: s.tasks.map((t) => ({ ...t })),
    }))
  );
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const updateTask = useCallback(
    (stageId: string, taskId: string | null, field: keyof WorkflowTask, value: unknown) => {
      setStages((prev) =>
        prev.map((s) =>
          s.id !== stageId
            ? s
            : {
                ...s,
                tasks: s.tasks.map((t) =>
                  t.id === taskId ? { ...t, [field]: value } : t
                ),
              }
        )
      );
    },
    []
  );

  const moveTask = useCallback((stageId: string, taskId: string | null, dir: -1 | 1) => {
    setStages((prev) =>
      prev.map((s) => {
        if (s.id !== stageId) return s;
        const idx = s.tasks.findIndex((t) => t.id === taskId);
        if (idx < 0) return s;
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= s.tasks.length) return s;
        const tasks = [...s.tasks];
        [tasks[idx], tasks[newIdx]] = [tasks[newIdx], tasks[idx]];
        return { ...s, tasks: tasks.map((t, i) => ({ ...t, task_order: i + 1 })) };
      })
    );
  }, []);

  const deleteTask = useCallback((stageId: string, taskId: string | null) => {
    if (taskId && !taskId.startsWith("_new_")) {
      setDeletedIds((ids) => [...ids, taskId]);
    }
    setStages((prev) =>
      prev.map((s) =>
        s.id !== stageId
          ? s
          : {
              ...s,
              tasks: s.tasks
                .filter((t) => t.id !== taskId)
                .map((t, i) => ({ ...t, task_order: i + 1 })),
            }
      )
    );
  }, []);

  const addTask = useCallback((stageId: string) => {
    setStages((prev) =>
      prev.map((s) => {
        if (s.id !== stageId) return s;
        const newTask: WorkflowTask = {
          id: newTaskId(),
          label: "",
          is_required: true,
          task_order: s.tasks.length + 1,
          stage_id: stageId,
        };
        return { ...s, tasks: [...s.tasks, newTask] };
      })
    );
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Flatten all tasks, normalise IDs for new ones
    const allTasks = stages.flatMap((s) =>
      s.tasks.map((t, i) => ({
        id: t.id?.startsWith("_new_") ? null : t.id,
        stage_id: s.id,
        label: t.label,
        is_required: t.is_required,
        task_order: i + 1,
      }))
    );

    const res = await fetch(`/api/settings/workflow/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: allTasks, deleted_ids: deletedIds }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Save failed.");
      setSaving(false);
      return;
    }

    onSaved(json.template);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white shadow-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Editing Workflow
          </p>
          <h2 className="text-base font-semibold text-slate-800">
            SC-{template.visa_subclass} — {template.label}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs text-red-600">{error}</span>
          )}
          <button
            onClick={onClose}
            className="border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={onClose} className="ml-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {stages.map((stage) => (
          <div key={stage.id} className="border border-slate-200 bg-white">
            {/* Stage header */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <Layers className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Stage {stage.stage_order}
              </span>
              <span className="text-sm font-medium text-slate-800">{stage.label}</span>
              <span className="ml-auto text-xs text-slate-400">
                {stage.tasks.length} task{stage.tasks.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Tasks */}
            <div className="divide-y divide-slate-100">
              {stage.tasks.length === 0 && (
                <p className="px-4 py-3 text-xs text-slate-400 italic">No tasks — add one below.</p>
              )}
              {stage.tasks.map((task, idx) => (
                <div
                  key={task.id ?? `new-${idx}`}
                  className="flex items-center gap-2 px-4 py-2.5"
                >
                  {/* Up/down */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveTask(stage.id, task.id, -1)}
                      disabled={idx === 0}
                      className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTask(stage.id, task.id, 1)}
                      disabled={idx === stage.tasks.length - 1}
                      className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Order number */}
                  <span className="w-5 text-center text-xs text-slate-400 tabular-nums">
                    {idx + 1}
                  </span>

                  {/* Label input */}
                  <input
                    type="text"
                    value={task.label}
                    onChange={(e) =>
                      updateTask(stage.id, task.id, "label", e.target.value)
                    }
                    placeholder="Task label…"
                    className="flex-1 border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
                  />

                  {/* Required toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      updateTask(stage.id, task.id, "is_required", !task.is_required)
                    }
                    className={cn(
                      "flex-shrink-0 rounded-sm px-2 py-1 text-xs font-medium transition-colors",
                      task.is_required
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                    title="Toggle required"
                  >
                    {task.is_required ? "Required" : "Optional"}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => deleteTask(stage.id, task.id)}
                    className="flex-shrink-0 p-1 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add task button */}
            <div className="border-t border-slate-100 px-4 py-2">
              <button
                type="button"
                onClick={() => addTask(stage.id)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add task to {stage.label}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Workflow Templates ───────────────────────────────────────────────────────────

function WorkflowTemplatesSection({
  initialTemplates,
  globalTemplates,
  onTemplatesChange,
}: {
  initialTemplates: WorkflowTemplate[];
  globalTemplates: GlobalTemplate[];
  onTemplatesChange?: (templates: WorkflowTemplate[]) => void;
}) {
  const [templates, setTemplates]   = useState(initialTemplates);
  const [globals, setGlobals]       = useState(globalTemplates);
  const [editTarget, setEditTarget] = useState<WorkflowTemplate | null>(null);
  const [cloningSubclass, setCloningSubclass] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const handleClone = async (subclass: string) => {
    setCloningSubclass(subclass);
    setCloneError(null);
    const res = await fetch("/api/settings/workflow/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visa_subclass: subclass }),
    });
    const json = await res.json().catch(() => ({}));
    setCloningSubclass(null);
    if (!res.ok) {
      setCloneError(json.error ?? "Clone failed.");
      return;
    }
    setTemplates((prev) => {
      const next = [...prev, json.template].sort((a, b) =>
        a.visa_subclass.localeCompare(b.visa_subclass)
      );
      onTemplatesChange?.(next);
      return next;
    });
    setGlobals((prev) => prev.filter((g) => g.visa_subclass !== subclass));
  };

  const handleSaved = (updated: WorkflowTemplate) => {
    setTemplates((prev) => {
      const next = prev.map((t) => (t.id === updated.id ? updated : t));
      onTemplatesChange?.(next);
      return next;
    });
  };

  return (
    <>
      <div className="space-y-6">
        <SectionLabel>Workflow Templates</SectionLabel>

        {cloneError && (
          <Toast message={cloneError} type="error" />
        )}

        {/* Firm templates */}
        {templates.length > 0 && (
          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-4 border border-slate-200 bg-white px-5 py-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="rounded-sm bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                      SC-{t.visa_subclass}
                    </span>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {t.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {t.stage_count} stage{t.stage_count !== 1 ? "s" : ""} ·{" "}
                    {t.task_count} task{t.task_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => setEditTarget(t)}
                  className="flex items-center gap-1.5 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Global templates not yet set up */}
        {globals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">
              Available system templates — click to set up a customisable copy for your firm:
            </p>
            {globals.map((g) => (
              <div
                key={g.visa_subclass}
                className="flex items-center gap-4 border border-dashed border-slate-300 bg-slate-50 px-5 py-3.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-sm border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-500">
                      SC-{g.visa_subclass}
                    </span>
                    <span className="text-sm text-slate-500 truncate">{g.label}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleClone(g.visa_subclass)}
                  disabled={cloningSubclass === g.visa_subclass}
                  className="flex items-center gap-1.5 bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {cloningSubclass === g.visa_subclass
                    ? "Setting up…"
                    : `Set up SC-${g.visa_subclass} workflow`}
                </button>
              </div>
            ))}
          </div>
        )}

        {templates.length === 0 && globals.length === 0 && (
          <p className="text-sm text-slate-400 italic">
            No workflow templates available.
          </p>
        )}
      </div>

      {editTarget && (
        <WorkflowEditModal
          template={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            handleSaved(updated);
            setEditTarget(null);
          }}
        />
      )}
    </>
  );
}

// ─── Sidebar Nav ─────────────────────────────────────────────────────────────────

const BASE_NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "firm",     label: "Firm Settings",     icon: <Building2 className="h-4 w-4" /> },
  { id: "profile",  label: "My Profile",         icon: <User className="h-4 w-4" /> },
  { id: "workflow", label: "Workflow Templates", icon: <GitBranch className="h-4 w-4" /> },
  { id: "team",     label: "Team",               icon: <Users className="h-4 w-4" /> },
];

// ─── Main Component ───────────────────────────────────────────────────────────────

export function SettingsPage({
  firm,
  profile,
  templates,
  globalTemplates,
  teamMembers = [],
  pendingInvitations = [],
  showTeam = false,
}: Props) {
  const [section, setSection] = useState<Section>("firm");

  // useState (not useRef) so that saved values persist across tab switches.
  // When a child form saves successfully it calls onSaved which updates these,
  // so the next time the form mounts it starts with the freshly saved values.
  const [firmData, setFirmData]           = useState(firm);
  const [profileData, setProfileData]     = useState(profile);
  const [templatesData, setTemplatesData] = useState(templates);
  const [globalsData]                     = useState(globalTemplates);
  const [teamMembersData]                 = useState(teamMembers);
  const [invitationsData]                 = useState(pendingInvitations);

  const navItems = BASE_NAV.filter((item) => item.id !== "team" || showTeam);

  return (
    <div className="flex min-h-full gap-0 -mx-6 -mt-6">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-slate-200 bg-white pt-6">
        <p className="px-5 pb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Settings
        </p>
        <nav className="space-y-0.5 px-2">
          {navItems.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-colors",
                section === id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {section === "firm" && (
          <FirmSettingsForm
            initialFirm={firmData}
            onSaved={setFirmData}
          />
        )}
        {section === "profile" && (
          <ProfileForm
            initialProfile={profileData}
            onSaved={setProfileData}
          />
        )}
        {section === "workflow" && (
          <WorkflowTemplatesSection
            initialTemplates={templatesData}
            globalTemplates={globalsData}
            onTemplatesChange={setTemplatesData}
          />
        )}
        {section === "team" && showTeam && (
          <TeamSettings
            initialMembers={teamMembersData}
            initialInvitations={invitationsData}
            currentUserId={profileData.id}
          />
        )}
      </div>
    </div>
  );
}
