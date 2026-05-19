"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X, Loader2, AlertCircle } from "lucide-react";

const DEADLINE_TYPES = [
  { value: "dha",      label: "DHA / Department" },
  { value: "document", label: "Document" },
  { value: "client",   label: "Client" },
  { value: "internal", label: "Internal" },
];

interface Props {
  caseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddDeadlineModalStandalone({ caseId, onClose, onSuccess }: Props) {
  const [label, setLabel] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineType, setDeadlineType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const submit = async () => {
    if (!label.trim() || !deadlineDate) {
      setError("Label and date are required.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/deadlines/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId,
        label: label.trim(),
        deadline_date: deadlineDate,
        deadline_type: deadlineType || null,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      setError(data.error ?? "Failed to create deadline.");
      setSubmitting(false);
      return;
    }
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Add Deadline</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Health assessment due"
              autoFocus
              className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Type</label>
            <div className="relative">
              <select
                value={deadlineType}
                onChange={(e) => setDeadlineType(e.target.value)}
                className="w-full appearance-none border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                <option value="">— Optional —</option>
                {DEADLINE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex items-center gap-2 bg-[#0f172a] px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add Deadline
          </button>
        </div>
      </div>
    </div>
  );
}
