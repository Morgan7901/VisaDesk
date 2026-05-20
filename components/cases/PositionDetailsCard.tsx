"use client";

import { useState } from "react";
import { Briefcase, CheckCheck, AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const TSMIT = 73150;

export interface PositionDetailsData {
  position_title: string | null;
  anzsco_code: string | null;
  salary: number | null;
  work_location: string | null;
  lmt_exempt: boolean | null;
  lmt_exempt_reason: string | null;
  skills_assessment_body: string | null;
  skills_assessment_status: string | null;
}

export function PositionDetailsCard({
  caseId,
  initialData,
}: {
  caseId: string;
  initialData: PositionDetailsData;
}) {
  const [fields, setFields] = useState({
    position_title: initialData.position_title ?? "",
    anzsco_code: initialData.anzsco_code ?? "",
    salary: initialData.salary !== null ? String(initialData.salary) : "",
    work_location: initialData.work_location ?? "",
    lmt_exempt: initialData.lmt_exempt ?? false,
    lmt_exempt_reason: initialData.lmt_exempt_reason ?? "",
    skills_assessment_body: initialData.skills_assessment_body ?? "",
    skills_assessment_status: initialData.skills_assessment_status ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const salaryNum = parseFloat(fields.salary);
  const showTsmitWarning = fields.salary !== "" && !isNaN(salaryNum) && salaryNum > 0 && salaryNum < TSMIT;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/position-details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_title: fields.position_title.trim() || null,
          anzsco_code: fields.anzsco_code.trim() || null,
          salary: fields.salary !== "" && !isNaN(parseFloat(fields.salary))
            ? parseFloat(fields.salary)
            : null,
          work_location: fields.work_location.trim() || null,
          lmt_exempt: fields.lmt_exempt,
          lmt_exempt_reason: fields.lmt_exempt ? (fields.lmt_exempt_reason || null) : null,
          skills_assessment_body: fields.skills_assessment_body.trim() || null,
          skills_assessment_status: fields.skills_assessment_status || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error ?? "Save failed");
      }
      showToast("Position details saved ✓", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-6 border border-slate-200 bg-white">
        {/* Card header */}
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Briefcase className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Position Details</h2>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Position Title */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Position Title
              </label>
              <input
                type="text"
                value={fields.position_title}
                onChange={(e) => setFields((p) => ({ ...p, position_title: e.target.value }))}
                placeholder="e.g. Software Engineer"
                className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* ANZSCO Code */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                ANZSCO Code
              </label>
              <input
                type="text"
                value={fields.anzsco_code}
                onChange={(e) => setFields((p) => ({ ...p, anzsco_code: e.target.value }))}
                placeholder="e.g. 261312"
                className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Salary */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Salary (AUD)
              </label>
              <input
                type="number"
                value={fields.salary}
                onChange={(e) => setFields((p) => ({ ...p, salary: e.target.value }))}
                placeholder="e.g. 90000"
                min="0"
                step="1"
                className={cn(
                  "w-full border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1",
                  showTsmitWarning
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                )}
              />
              {showTsmitWarning && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Below TSMIT (${TSMIT.toLocaleString()})
                </p>
              )}
            </div>

            {/* Work Location */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Work Location
              </label>
              <input
                type="text"
                value={fields.work_location}
                onChange={(e) => setFields((p) => ({ ...p, work_location: e.target.value }))}
                placeholder="e.g. Sydney, NSW"
                className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Skills Assessment Body */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Skills Assessment Body
              </label>
              <input
                type="text"
                value={fields.skills_assessment_body}
                onChange={(e) => setFields((p) => ({ ...p, skills_assessment_body: e.target.value }))}
                placeholder="e.g. ACS, Engineers Australia"
                className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Skills Assessment Status */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Skills Assessment Status
              </label>
              <div className="relative">
                <select
                  value={fields.skills_assessment_status}
                  onChange={(e) => setFields((p) => ({ ...p, skills_assessment_status: e.target.value }))}
                  className="w-full appearance-none border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  <option value="">— Select —</option>
                  <option value="not_required">Not Required</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* LMT Exempt */}
            <div className="flex items-center gap-3 lg:col-span-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={fields.lmt_exempt}
                  onChange={(e) =>
                    setFields((p) => ({
                      ...p,
                      lmt_exempt: e.target.checked,
                      lmt_exempt_reason: e.target.checked ? p.lmt_exempt_reason : "",
                    }))
                  }
                  className="h-4 w-4 border-slate-300 accent-[#0f172a]"
                />
                <span className="text-sm font-medium text-slate-700">LMT Exempt</span>
              </label>
            </div>

            {/* LMT Exempt Reason — only when exempt */}
            {fields.lmt_exempt && (
              <div className="lg:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  LMT Exempt Reason
                </label>
                <div className="relative">
                  <select
                    value={fields.lmt_exempt_reason}
                    onChange={(e) => setFields((p) => ({ ...p, lmt_exempt_reason: e.target.value }))}
                    className="w-full appearance-none border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="">Select reason...</option>
                    <option value="fta_country">FTA Country</option>
                    <option value="salary_above_threshold">Salary Above LMT Threshold</option>
                    <option value="other">Other</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Position Details
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-2",
            toast.type === "success" ? "bg-[#0f172a]" : "bg-red-600"
          )}
        >
          {toast.type === "success" ? (
            <CheckCheck className="h-4 w-4 text-green-400" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {toast.msg}
        </div>
      )}
    </>
  );
}
