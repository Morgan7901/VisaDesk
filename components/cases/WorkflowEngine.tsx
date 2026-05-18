"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Zap,
  Globe,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowTask {
  progress_id: string;
  task_id: string;
  label: string;
  task_order: number;
  is_required: boolean;
  trigger_type: string | null;
  requires_portal: string | null;
  is_complete: boolean;
  completed_at: string | null;
}

interface WorkflowStage {
  progress_id: string;
  stage_id: string;
  label: string;
  stage_order: number;
  icon: string | null;
  is_complete: boolean;
  completed_at: string | null;
  tasks: WorkflowTask[];
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

interface Props {
  caseId: string;
  visaSubclass: string;
}

export function WorkflowEngine({ caseId, visaSubclass }: Props) {
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openStages, setOpenStages] = useState<Set<string>>(new Set());
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [savingStage, setSavingStage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setFetchError(null);
      const res = await fetch(`/api/cases/${caseId}/workflow`);
      if (!res.ok) {
        setFetchError("Failed to load workflow.");
        setLoading(false);
        return;
      }
      const { stages: data } = (await res.json()) as { stages: WorkflowStage[] };
      setStages(data);
      const firstIncomplete = data.find((s) => !s.is_complete);
      if (firstIncomplete) {
        setOpenStages(new Set([firstIncomplete.stage_id]));
      } else if (data.length > 0) {
        setOpenStages(new Set([data[data.length - 1].stage_id]));
      }
      setLoading(false);
    }
    load();
  }, [caseId]);

  function toggleStageOpen(stageId: string) {
    setOpenStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  }

  async function toggleTask(stage: WorkflowStage, task: WorkflowTask) {
    if (savingTask || stage.is_complete) return;

    setSavingTask(task.task_id);
    const newComplete = !task.is_complete;

    setStages((prev) =>
      prev.map((s) =>
        s.stage_id === stage.stage_id
          ? {
              ...s,
              tasks: s.tasks.map((t) =>
                t.task_id === task.task_id ? { ...t, is_complete: newComplete } : t
              ),
            }
          : s
      )
    );

    const endpoint = newComplete ? "complete" : "uncomplete";
    const res = await fetch(`/api/cases/${caseId}/tasks/${task.task_id}/${endpoint}`, {
      method: "POST",
    });

    if (!res.ok) {
      setStages((prev) =>
        prev.map((s) =>
          s.stage_id === stage.stage_id
            ? {
                ...s,
                tasks: s.tasks.map((t) =>
                  t.task_id === task.task_id ? { ...t, is_complete: task.is_complete } : t
                ),
              }
            : s
        )
      );
      addToast("Failed to update task.", "error");
    }

    setSavingTask(null);
  }

  async function completeStage(stage: WorkflowStage) {
    if (savingStage || stage.is_complete) return;

    setSavingStage(stage.stage_id);

    setStages((prev) =>
      prev.map((s) =>
        s.stage_id === stage.stage_id ? { ...s, is_complete: true } : s
      )
    );

    const res = await fetch(`/api/cases/${caseId}/stages/${stage.stage_id}/complete`, {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json();
      setStages((prev) =>
        prev.map((s) =>
          s.stage_id === stage.stage_id ? { ...s, is_complete: false } : s
        )
      );
      addToast(data.error ?? "Failed to complete stage.", "error");
    } else {
      addToast(`"${stage.label}" marked complete.`, "success");
    }

    setSavingStage(null);
  }

  const completedCount = stages.filter((s) => s.is_complete).length;
  const totalCount = stages.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-red-500">{fetchError}</p>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center border border-dashed border-slate-300 bg-white rounded-lg">
        <p className="text-sm text-slate-400">
          No workflow template found for SC-{visaSubclass}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            SC-{visaSubclass} Workflow
          </span>
          <span className="text-sm text-slate-500">
            {completedCount} / {totalCount} stages complete
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#0f172a] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Stages */}
      {stages.map((stage, idx) => {
        const isOpen = openStages.has(stage.stage_id);
        const requiredRemaining = stage.tasks.filter(
          (t) => t.is_required && !t.is_complete
        ).length;
        const canComplete = !stage.is_complete && requiredRemaining === 0;
        const tasksDone = stage.tasks.filter((t) => t.is_complete).length;
        const isSavingThis = savingStage === stage.stage_id;

        return (
          <div
            key={stage.stage_id}
            className={cn(
              "overflow-hidden rounded-lg border bg-white transition-colors",
              stage.is_complete
                ? "border-emerald-200"
                : "border-slate-200"
            )}
          >
            {/* Stage header */}
            <button
              type="button"
              onClick={() => toggleStageOpen(stage.stage_id)}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
            >
              {/* Stage number / completion icon */}
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  stage.is_complete
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                {stage.is_complete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  idx + 1
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      stage.is_complete ? "text-slate-500" : "text-slate-800"
                    )}
                  >
                    {stage.label}
                  </span>
                  {stage.is_complete && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Complete
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {tasksDone} / {stage.tasks.length} tasks done
                </p>
              </div>

              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
            </button>

            {/* Stage body */}
            {isOpen && (
              <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                <ul className="space-y-1">
                  {stage.tasks.map((task) => {
                    const isThisSaving = savingTask === task.task_id;
                    return (
                      <li
                        key={task.task_id}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2 py-2 transition-colors",
                          stage.is_complete
                            ? "cursor-default"
                            : "cursor-pointer hover:bg-slate-50"
                        )}
                        onClick={() => toggleTask(stage, task)}
                      >
                        {isThisSaving ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
                        ) : task.is_complete ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                        )}

                        <span
                          className={cn(
                            "flex-1 text-sm",
                            task.is_complete
                              ? "text-slate-400 line-through"
                              : "text-slate-700"
                          )}
                        >
                          {task.label}
                          {!task.is_required && (
                            <span className="ml-1.5 text-xs text-slate-400">(optional)</span>
                          )}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {task.trigger_type && (
                            <span
                              title={`Automation: ${task.trigger_type}`}
                              className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-600"
                            >
                              <Zap className="h-3 w-3" />
                              Auto
                            </span>
                          )}
                          {task.requires_portal && (
                            <span
                              title={`Portal: ${task.requires_portal}`}
                              className="flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-xs text-sky-600"
                            >
                              <Globe className="h-3 w-3" />
                              Portal
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {!stage.is_complete && (
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    {requiredRemaining > 0 ? (
                      <p className="text-xs text-slate-400">
                        {requiredRemaining} required task{requiredRemaining !== 1 ? "s" : ""} remaining
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-600">All required tasks complete</p>
                    )}
                    <button
                      type="button"
                      disabled={!canComplete || isSavingThis}
                      onClick={() => completeStage(stage)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        canComplete && !isSavingThis
                          ? "bg-[#0f172a] text-white hover:bg-slate-700"
                          : "cursor-not-allowed bg-slate-100 text-slate-400"
                      )}
                    >
                      {isSavingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckSquare className="h-3.5 w-3.5" />
                      )}
                      Mark Stage Complete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg",
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            )}
          >
            {toast.type === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
