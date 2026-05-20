"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  MessageSquare,
  ClipboardList,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionField {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  placeholder: string | null;
  help_text: string | null;
  required: boolean;
  options: string[] | null;
  display_order: number;
}

interface Section {
  id: string;
  title: string;
  section_key: string;
  display_order: number;
  fields: SectionField[];
}

interface CaseOverviewProps {
  caseId: string;
  visaSubclass: string;
  fieldValues: Record<string, unknown>;
  sections: Section[];
  pendingDocCount: number;
  nextDeadline: { label: string; deadline_date: string } | null;
  lastComm: { subject: string | null; created_at: string; direction: string } | null;
  hasTemplate: boolean;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Count non-null/non-empty field values within a set of field keys
function countFilledFields(fields: SectionField[], values: Record<string, unknown>): number {
  return fields.filter((f) => {
    const v = values[f.field_key];
    if (v === null || v === undefined || v === "") return false;
    if (typeof v === "boolean") return true;
    return true;
  }).length;
}

interface FieldEditorProps {
  field: SectionField;
  value: unknown;
  caseId: string;
  onChange: (field_key: string, value: unknown) => void;
}

function FieldEditor({ field, value, caseId, onChange }: FieldEditorProps) {
  const [localValue, setLocalValue] = useState<unknown>(value ?? "");
  const [saving, setSaving] = useState(false);

  const handleBlur = useCallback(async () => {
    if (localValue === (value ?? "")) return;
    setSaving(true);
    try {
      await fetch(`/api/cases/${caseId}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_key: field.field_key, value: localValue }),
      });
      onChange(field.field_key, localValue);
    } catch {
      // silently ignore
    } finally {
      setSaving(false);
    }
  }, [localValue, value, caseId, field.field_key, onChange]);

  const handleCheckboxChange = useCallback(
    async (checked: boolean) => {
      setLocalValue(checked);
      setSaving(true);
      try {
        await fetch(`/api/cases/${caseId}/fields`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field_key: field.field_key, value: checked }),
        });
        onChange(field.field_key, checked);
      } catch {
        // silently ignore
      } finally {
        setSaving(false);
      }
    },
    [caseId, field.field_key, onChange]
  );

  const baseInputClass =
    "w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400";

  const renderInput = () => {
    const strValue = localValue === null || localValue === undefined ? "" : String(localValue);

    switch (field.field_type) {
      case "text":
      case "email":
      case "phone":
        return (
          <input
            type={field.field_type === "email" ? "email" : field.field_type === "phone" ? "tel" : "text"}
            value={strValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            placeholder={field.placeholder ?? "Not set"}
            className={baseInputClass}
          />
        );

      case "textarea":
        return (
          <textarea
            rows={3}
            value={strValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            placeholder={field.placeholder ?? "Not set"}
            className={cn(baseInputClass, "resize-y")}
          />
        );

      case "date":
        return (
          <input
            type="date"
            value={strValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            className={baseInputClass}
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={strValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            placeholder={field.placeholder ?? ""}
            className={baseInputClass}
          />
        );

      case "currency":
        return (
          <div className="flex items-center">
            <span className="inline-flex items-center border border-r-0 border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-500">
              AUD
            </span>
            <input
              type="number"
              value={strValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={handleBlur}
              placeholder={field.placeholder ?? "0.00"}
              className={cn(baseInputClass, "flex-1")}
            />
          </div>
        );

      case "select":
        return (
          <select
            value={strValue}
            onChange={async (e) => {
              const v = e.target.value;
              setLocalValue(v);
              setSaving(true);
              try {
                await fetch(`/api/cases/${caseId}/fields`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ field_key: field.field_key, value: v }),
                });
                onChange(field.field_key, v);
              } catch {
                // silently ignore
              } finally {
                setSaving(false);
              }
            }}
            className={cn(baseInputClass, "appearance-none")}
          >
            <option value="">Select…</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "multi_select":
        return (
          <input
            type="text"
            value={strValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            placeholder={field.placeholder ?? "Comma-separated values"}
            className={baseInputClass}
          />
        );

      case "checkbox":
        return (
          <label className="flex cursor-pointer items-center gap-2">
            <div
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                localValue ? "bg-slate-800" : "bg-slate-200"
              )}
              onClick={() => handleCheckboxChange(!localValue)}
            >
              <div
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  localValue ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </div>
            <span className="text-sm text-slate-600">
              {localValue ? "Yes" : "No"}
            </span>
            {saving && <span className="text-xs text-slate-400">Saving…</span>}
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={strValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            placeholder={field.placeholder ?? "Not set"}
            className={baseInputClass}
          />
        );
    }
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
        {saving && field.field_type !== "checkbox" && (
          <span className="ml-1.5 text-[10px] font-normal text-slate-400">Saving…</span>
        )}
      </label>
      {renderInput()}
      {field.help_text && (
        <p className="mt-1 text-xs text-slate-400">{field.help_text}</p>
      )}
    </div>
  );
}

interface SectionCardProps {
  section: Section;
  caseId: string;
  fieldValues: Record<string, unknown>;
  onFieldChange: (field_key: string, value: unknown) => void;
}

function SectionCard({ section, caseId, fieldValues, onFieldChange }: SectionCardProps) {
  const [expanded, setExpanded] = useState(true);
  const filledCount = countFilledFields(section.fields, fieldValues);

  return (
    <div className="border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-800">{section.title}</span>
          <span className="text-xs text-slate-400">
            {filledCount}/{section.fields.length} filled
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {section.fields.map((field) => (
              <FieldEditor
                key={field.id}
                field={field}
                value={fieldValues[field.field_key]}
                caseId={caseId}
                onChange={onFieldChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CaseOverview({
  caseId,
  visaSubclass,
  fieldValues: initialFieldValues,
  sections,
  pendingDocCount,
  nextDeadline,
  lastComm,
  hasTemplate,
}: CaseOverviewProps) {
  const params = useParams<{ id: string }>();
  const base = `/dashboard/cases/${params?.id ?? caseId}`;

  const [fieldValues, setFieldValues] = useState(initialFieldValues);

  const handleFieldChange = useCallback((field_key: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [field_key]: value }));
  }, []);

  const totalFilledCount = Object.values(fieldValues).filter(
    (v) => v !== null && v !== undefined && v !== ""
  ).length;

  return (
    <div className="space-y-6">
      {/* SC-500 info banner */}
      {visaSubclass === "500" && (
        <div className="flex items-start gap-3 border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <span>
            GS Responses and Supporting Statement are generated in AI Tools using your uploaded
            documents.{" "}
            <Link href={`${base}/ai`} className="font-medium underline hover:no-underline">
              Go to AI Tools →
            </Link>
          </span>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Pending Documents */}
        <Link
          href={`${base}/documents`}
          className="group flex flex-col gap-1 border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Pending Docs</span>
          </div>
          <span className="text-2xl font-bold text-slate-900">{pendingDocCount}</span>
          <span className="text-xs text-slate-400 group-hover:text-blue-600">View documents →</span>
        </Link>

        {/* Next Deadline */}
        <div className="flex flex-col gap-1 border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Next Deadline</span>
          </div>
          {nextDeadline ? (
            <>
              <span className="text-sm font-semibold text-slate-800 line-clamp-1">
                {nextDeadline.label}
              </span>
              <span className="text-xs text-slate-400">
                {formatDate(nextDeadline.deadline_date)} &middot;{" "}
                {daysUntil(nextDeadline.deadline_date)} days
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-400">No upcoming deadlines</span>
          )}
        </div>

        {/* Last Comms */}
        <Link
          href={`${base}/comms`}
          className="group flex flex-col gap-1 border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Last Comms</span>
          </div>
          {lastComm ? (
            <>
              <span className="text-sm font-semibold text-slate-800 line-clamp-1">
                {lastComm.subject ?? "(no subject)"}
              </span>
              <span className="text-xs text-slate-400">
                {formatDate(lastComm.created_at)} &middot; {lastComm.direction}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-400">No communications yet</span>
          )}
        </Link>

        {/* Overview Fields */}
        <div className="flex flex-col gap-1 border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <ClipboardList className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Fields Filled</span>
          </div>
          <span className="text-2xl font-bold text-slate-900">{totalFilledCount}</span>
          <span className="text-xs text-slate-400">case data fields</span>
        </div>
      </div>

      {/* No template */}
      {!hasTemplate && (
        <div className="flex items-start gap-3 border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>
            No case template assigned. Templates capture structured case data like course details,
            salary information, and relationship timelines.
          </span>
        </div>
      )}

      {/* Sections */}
      {hasTemplate && sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              caseId={caseId}
              fieldValues={fieldValues}
              onFieldChange={handleFieldChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
