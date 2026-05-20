"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Lock,
  Pencil,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Copy,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TemplateField {
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

interface TemplateSection {
  id: string;
  title: string;
  section_key: string;
  display_order: number;
  fields: TemplateField[];
}

interface CaseTemplate {
  id: string;
  name: string;
  visa_subclass: string;
  description: string | null;
  is_system_default: boolean;
  is_active: boolean;
  sections: TemplateSection[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  "w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-500";

const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "multi_select",
  "boolean",
  "email",
  "phone",
  "url",
];

function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

// ── Add Field Form ────────────────────────────────────────────────────────────

function AddFieldForm({
  templateId,
  sectionId,
  onAdded,
}: {
  templateId: string;
  sectionId: string;
  onAdded: (field: TemplateField) => void;
}) {
  const [label, setLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [placeholder, setPlaceholder] = useState("");
  const [helpText, setHelpText] = useState("");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLabelChange = (val: string) => {
    setLabel(val);
    setFieldKey(toSnakeCase(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !fieldKey.trim()) return;
    setSaving(true);
    setError(null);

    const parsedOptions =
      (fieldType === "select" || fieldType === "multi_select") && options.trim()
        ? options.split(",").map((o) => o.trim()).filter(Boolean)
        : null;

    const res = await fetch(
      `/api/settings/templates/${templateId}/sections/${sectionId}/fields`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          field_key: fieldKey.trim(),
          field_type: fieldType,
          placeholder: placeholder.trim() || null,
          help_text: helpText.trim() || null,
          required,
          options: parsedOptions,
        }),
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to add field.");
      setSaving(false);
      return;
    }
    onAdded(json.field as TemplateField);
    setLabel("");
    setFieldKey("");
    setFieldType("text");
    setPlaceholder("");
    setHelpText("");
    setRequired(false);
    setOptions("");
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 border border-dashed border-slate-300 bg-slate-50 p-3 space-y-2"
    >
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Add Field
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-0.5 block text-xs text-slate-500">Label *</label>
          <input
            type="text"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Field label"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs text-slate-500">Field Key *</label>
          <input
            type="text"
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value)}
            placeholder="field_key"
            className={inputCls}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-0.5 block text-xs text-slate-500">Type</label>
          <select
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value)}
            className={inputCls}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-0.5 block text-xs text-slate-500">Placeholder</label>
          <input
            type="text"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            placeholder="Placeholder text"
            className={inputCls}
          />
        </div>
      </div>
      {(fieldType === "select" || fieldType === "multi_select") && (
        <div>
          <label className="mb-0.5 block text-xs text-slate-500">
            Options (comma-separated)
          </label>
          <input
            type="text"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder="Option 1, Option 2, Option 3"
            className={inputCls}
          />
        </div>
      )}
      <div>
        <label className="mb-0.5 block text-xs text-slate-500">Help Text</label>
        <input
          type="text"
          value={helpText}
          onChange={(e) => setHelpText(e.target.value)}
          placeholder="Help text for agents"
          className={inputCls}
        />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Required
        </label>
        <button
          type="submit"
          disabled={saving || !label.trim() || !fieldKey.trim()}
          className="ml-auto flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
          {saving ? "Adding…" : "Add Field"}
        </button>
      </div>
    </form>
  );
}

// ── Section Editor ────────────────────────────────────────────────────────────

function SectionEditor({
  templateId,
  section,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onTitleChange,
  onDelete,
  onFieldAdded,
  onFieldDeleted,
}: {
  templateId: string;
  section: TemplateSection;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onTitleChange: (title: string) => void;
  onDelete: () => void;
  onFieldAdded: (field: TemplateField) => void;
  onFieldDeleted: (fieldId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(section.title);
  const [savingTitle, setSavingTitle] = useState(false);

  const saveTitle = async () => {
    if (titleVal.trim() === section.title) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    await fetch(
      `/api/settings/templates/${templateId}/sections/${section.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleVal.trim() }),
      }
    );
    onTitleChange(titleVal.trim());
    setEditingTitle(false);
    setSavingTitle(false);
  };

  const handleDeleteField = async (fieldId: string) => {
    await fetch(`/api/settings/templates/${templateId}/fields/${fieldId}`, {
      method: "DELETE",
    });
    onFieldDeleted(fieldId);
  };

  return (
    <div className="border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        {editingTitle ? (
          <input
            type="text"
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); }}
            autoFocus
            disabled={savingTitle}
            className="flex-1 border border-slate-300 px-2 py-1 text-sm focus:outline-none"
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-slate-800">
            {section.title}
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditingTitle(true)}
          className="p-1 text-slate-400 hover:text-slate-700"
          title="Edit section title"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              expanded && "rotate-90"
            )}
          />
          {section.fields.length} field{section.fields.length !== 1 ? "s" : ""}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-slate-300 hover:text-red-500"
          title="Delete section"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 py-2">
          {section.fields.length === 0 && (
            <p className="text-xs text-slate-400 italic py-1">
              No fields yet — add one below.
            </p>
          )}
          <div className="space-y-1">
            {section.fields
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-2 rounded-sm border border-slate-100 bg-slate-50 px-2 py-1.5"
                >
                  <span className="flex-1 text-xs font-medium text-slate-700">
                    {field.label}
                  </span>
                  <span className="rounded-sm bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                    {field.field_type}
                  </span>
                  {field.required && (
                    <span className="rounded-sm bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                      required
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteField(field.id)}
                    className="p-0.5 text-slate-300 hover:text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
          </div>
          <AddFieldForm
            templateId={templateId}
            sectionId={section.id}
            onAdded={onFieldAdded}
          />
        </div>
      )}
    </div>
  );
}

// ── Template Editor Panel (right panel) ──────────────────────────────────────

function TemplateEditorPanel({
  template,
  onUpdate,
  onDuplicate,
  onDelete,
}: {
  template: CaseTemplate;
  onUpdate: (updated: CaseTemplate) => void;
  onDuplicate: (newTemplate: CaseTemplate) => void;
  onDelete: (id: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingSectionTitle, setAddingSectionTitle] = useState("");
  const [addingSection, setAddingSection] = useState(false);

  // Local editable fields
  const [name, setName] = useState(template.name);
  const [visaSubclass, setVisaSubclass] = useState(template.visa_subclass);
  const [description, setDescription] = useState(template.description ?? "");
  const [isActive, setIsActive] = useState(template.is_active);

  // Reset local state when template changes
  useEffect(() => {
    setName(template.name);
    setVisaSubclass(template.visa_subclass);
    setDescription(template.description ?? "");
    setIsActive(template.is_active);
    setError(null);
  }, [template.id, template.name, template.visa_subclass, template.description, template.is_active]);

  const saveMetadata = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/settings/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        visa_subclass: visaSubclass.trim(),
        description: description.trim() || null,
        is_active: isActive,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Save failed.");
      setSaving(false);
      return;
    }
    onUpdate({ ...template, ...json.template });
    setSaving(false);
  };

  const handleDuplicate = async () => {
    const res = await fetch(`/api/settings/templates/${template.id}/duplicate`, {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.template) {
      onDuplicate(json.template as CaseTemplate);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
    await fetch(`/api/settings/templates/${template.id}`, { method: "DELETE" });
    onDelete(template.id);
  };

  const handleAddSection = async () => {
    if (!addingSectionTitle.trim()) return;
    setAddingSection(true);
    const res = await fetch(`/api/settings/templates/${template.id}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: addingSectionTitle.trim(),
        display_order: template.sections.length + 1,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.section) {
      onUpdate({
        ...template,
        sections: [...template.sections, { ...json.section, fields: [] }],
      });
    }
    setAddingSectionTitle("");
    setAddingSection(false);
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Delete this section and all its fields?")) return;
    await fetch(`/api/settings/templates/${template.id}/sections/${sectionId}`, {
      method: "DELETE",
    });
    onUpdate({
      ...template,
      sections: template.sections.filter((s) => s.id !== sectionId),
    });
  };

  const moveSectionDir = async (sectionId: string, dir: -1 | 1) => {
    const idx = template.sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= template.sections.length) return;

    const reordered = [...template.sections];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const updated = reordered.map((s, i) => ({ ...s, display_order: i + 1 }));

    // Persist new order for both affected sections
    await Promise.all([
      fetch(`/api/settings/templates/${template.id}/sections/${updated[idx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: updated[idx].display_order }),
      }),
      fetch(`/api/settings/templates/${template.id}/sections/${updated[newIdx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: updated[newIdx].display_order }),
      }),
    ]);

    onUpdate({ ...template, sections: updated });
  };

  // System template: read-only view
  if (template.is_system_default) {
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-800">{template.name}</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              SC-{template.visa_subclass} · System template (read-only)
            </p>
            {template.description && (
              <p className="mt-2 text-sm text-slate-600">{template.description}</p>
            )}
          </div>
          <button
            onClick={handleDuplicate}
            className="flex flex-shrink-0 items-center gap-1.5 border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate to customise
          </button>
        </div>

        <div className="space-y-3">
          {template.sections
            .slice()
            .sort((a, b) => a.display_order - b.display_order)
            .map((section) => (
              <div key={section.id} className="border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {section.title}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    ({section.fields.length} field{section.fields.length !== 1 ? "s" : ""})
                  </span>
                </div>
                {section.fields.length > 0 && (
                  <div className="divide-y divide-slate-50 px-4">
                    {section.fields
                      .slice()
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((field) => (
                        <div key={field.id} className="flex items-center gap-2 py-1.5">
                          <span className="flex-1 text-xs text-slate-700">{field.label}</span>
                          <span className="rounded-sm bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                            {field.field_type}
                          </span>
                          {field.required && (
                            <span className="rounded-sm bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">
                              required
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    );
  }

  // Firm template: full editor
  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Visa Subclass
            </label>
            <input
              type="text"
              value={visaSubclass}
              onChange={(e) => setVisaSubclass(e.target.value)}
              placeholder="e.g. 482"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief description of this template…"
            className={cn(inputCls, "resize-none")}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((v) => !v)}
              className={cn(
                "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none",
                isActive ? "bg-slate-800" : "bg-slate-300"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform",
                  isActive ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
            Active
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button
              type="button"
              onClick={saveMetadata}
              disabled={saving}
              className="flex items-center gap-1.5 bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Sections
        </p>
        <div className="space-y-2">
          {template.sections
            .slice()
            .sort((a, b) => a.display_order - b.display_order)
            .map((section, idx, arr) => (
              <SectionEditor
                key={section.id}
                templateId={template.id}
                section={section}
                isFirst={idx === 0}
                isLast={idx === arr.length - 1}
                onMoveUp={() => moveSectionDir(section.id, -1)}
                onMoveDown={() => moveSectionDir(section.id, 1)}
                onTitleChange={(title) =>
                  onUpdate({
                    ...template,
                    sections: template.sections.map((s) =>
                      s.id === section.id ? { ...s, title } : s
                    ),
                  })
                }
                onDelete={() => handleDeleteSection(section.id)}
                onFieldAdded={(field) =>
                  onUpdate({
                    ...template,
                    sections: template.sections.map((s) =>
                      s.id === section.id
                        ? { ...s, fields: [...s.fields, field] }
                        : s
                    ),
                  })
                }
                onFieldDeleted={(fieldId) =>
                  onUpdate({
                    ...template,
                    sections: template.sections.map((s) =>
                      s.id === section.id
                        ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
                        : s
                    ),
                  })
                }
              />
            ))}
        </div>

        {/* Add section form */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={addingSectionTitle}
            onChange={(e) => setAddingSectionTitle(e.target.value)}
            placeholder="New section title…"
            className={cn(inputCls, "flex-1")}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddSection(); }}
          />
          <button
            type="button"
            onClick={handleAddSection}
            disabled={addingSection || !addingSectionTitle.trim()}
            className="flex items-center gap-1.5 border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            {addingSection ? "Adding…" : "Add Section"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main TemplateSettings Component ──────────────────────────────────────────

export function TemplateSettings() {
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CaseTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubclass, setNewSubclass] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/settings/templates");
    const json = await res.json().catch(() => ({ templates: [] }));
    setTemplates(json.templates ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSubclass.trim()) return;
    setCreateError(null);
    const res = await fetch("/api/settings/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        visa_subclass: newSubclass.trim(),
        description: newDesc.trim() || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCreateError(json.error ?? "Create failed.");
      return;
    }
    const created = json.template as CaseTemplate;
    setTemplates((prev) => [...prev, created]);
    setSelected(created);
    setNewName("");
    setNewSubclass("");
    setNewDesc("");
    setCreating(false);
  };

  const systemTemplates = templates.filter((t) => t.is_system_default);
  const firmTemplates = templates.filter((t) => !t.is_system_default);

  return (
    <div className="flex gap-0 -mx-8 -my-6 min-h-[600px]">
      {/* Left panel */}
      <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Case Templates
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-6 text-xs text-slate-400">Loading…</p>
          ) : (
            <>
              {/* System templates */}
              {systemTemplates.length > 0 && (
                <div className="border-b border-slate-100">
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    System
                  </p>
                  {systemTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setCreating(false); setSelected(t); }}
                      className={cn(
                        "flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors",
                        selected?.id === t.id && "bg-slate-100"
                      )}
                    >
                      <Lock className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-700">
                          {t.name}
                        </p>
                        <p className="text-[10px] text-slate-400">SC-{t.visa_subclass}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const res = await fetch(
                            `/api/settings/templates/${t.id}/duplicate`,
                            { method: "POST" }
                          );
                          const json = await res.json().catch(() => ({}));
                          if (res.ok && json.template) {
                            const dup = json.template as CaseTemplate;
                            setTemplates((prev) => [...prev, dup]);
                            setSelected(dup);
                          }
                        }}
                        className="rounded-sm border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100"
                      >
                        Duplicate
                      </button>
                    </button>
                  ))}
                </div>
              )}

              {/* Firm templates */}
              {firmTemplates.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Your Firm
                  </p>
                  {firmTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setCreating(false); setSelected(t); }}
                      className={cn(
                        "flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors",
                        selected?.id === t.id && "bg-slate-100"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-700">
                          {t.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          SC-{t.visa_subclass} ·{" "}
                          <span
                            className={
                              t.is_active ? "text-green-600" : "text-slate-400"
                            }
                          >
                            {t.is_active ? "active" : "inactive"}
                          </span>
                        </p>
                      </div>
                      <Pencil className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}

              {templates.length === 0 && (
                <p className="px-4 py-6 text-xs text-slate-400 italic">
                  No templates yet.
                </p>
              )}
            </>
          )}
        </div>

        {/* New template button */}
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={() => { setCreating(true); setSelected(null); }}
            className="flex w-full items-center justify-center gap-2 border border-slate-300 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            New Template
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {creating ? (
          <div className="max-w-lg">
            <h2 className="mb-5 text-base font-semibold text-slate-800">
              New Template
            </h2>
            {createError && (
              <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. SC-482 TSS — Short-Term Stream"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Visa Subclass *
                </label>
                <input
                  type="text"
                  value={newSubclass}
                  onChange={(e) => setNewSubclass(e.target.value)}
                  placeholder="e.g. 482"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="Brief description…"
                  className={cn(inputCls, "resize-none")}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || !newSubclass.trim()}
                  className="bg-slate-800 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        ) : selected ? (
          <TemplateEditorPanel
            key={selected.id}
            template={selected}
            onUpdate={(updated) => {
              setTemplates((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t))
              );
              setSelected(updated);
            }}
            onDuplicate={(newTemplate) => {
              setTemplates((prev) => [...prev, newTemplate]);
              setSelected(newTemplate);
            }}
            onDelete={(id) => {
              setTemplates((prev) => prev.filter((t) => t.id !== id));
              setSelected(null);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 italic">
            Select a template to edit
          </div>
        )}
      </div>
    </div>
  );
}
