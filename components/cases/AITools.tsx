"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Save,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateWordDoc } from "@/lib/wordGenerator";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AIToolsProps {
  caseId: string;
  caseContext: {
    visa_subclass: string;
    visa_stream: string | null;
    status: string;
    notes: string | null;
    lodgement_date: string | null;
    grant_date: string | null;
    visa_expiry: string | null;
    trn: string | null;
    ref_number: string | null;
  };
  client: {
    full_name: string;
    nationality: string | null;
    date_of_birth: string | null;
    passport_number: string | null;
    passport_expiry: string | null;
  };
  sponsor: {
    company_name: string;
    abn: string | null;
    contact_name: string | null;
    sbs_status: string | null;
  } | null;
  firm: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  agent: {
    full_name: string;
    email: string | null;
    mara_number: string | null;
  };
  documents: { id: string; label: string; status: string }[];
  aiDocuments: {
    id: string;
    document_type: string;
    title: string;
    content: string;
    created_at: string;
  }[];
}

interface DocCardDef {
  type: string;
  name: string;
  description: string;
}

// ── Document catalogue ────────────────────────────────────────────────────────

const ALL_DOCS: DocCardDef[] = [
  {
    type: "CLIENT_WELCOME_LETTER",
    name: "Client Welcome Letter",
    description: "Professional welcome letter confirming engagement and outlining next steps.",
  },
  {
    type: "VISA_GRANT_NOTIFICATION",
    name: "Visa Grant Notification",
    description: "Congratulatory letter with visa details and key conditions.",
  },
  {
    type: "VISA_REFUSAL_LETTER",
    name: "Visa Refusal Letter",
    description: "Empathetic notification of refusal outcome with review options.",
  },
];

const SC500_DOCS: DocCardDef[] = [
  {
    type: "GS_FORM_RESPONSES",
    name: "GS Form Responses",
    description: "Answers to the 5 DHA Genuine Student questions — each under 150 words — for the ImmiAccount form.",
  },
  {
    type: "GS_SUPPORTING_STATEMENT",
    name: "GS Supporting Statement",
    description: "600–800 word narrative document for upload to ImmiAccount as supporting evidence.",
  },
  {
    type: "CLIENT_WELCOME_LETTER",
    name: "Client Welcome Letter",
    description: "Professional welcome letter confirming engagement and outlining next steps.",
  },
  {
    type: "DOCUMENT_REQUEST_LETTER",
    name: "Document Request Letter",
    description: "Formal letter requesting outstanding documents from the client.",
  },
  {
    type: "VISA_GRANT_NOTIFICATION",
    name: "Visa Grant Notification",
    description: "Congratulatory letter with visa details and key conditions.",
  },
  {
    type: "VISA_REFUSAL_LETTER",
    name: "Visa Refusal Letter",
    description: "Empathetic notification of refusal outcome with review options.",
  },
];

const SC482_DOCS: DocCardDef[] = [
  {
    type: "POSITION_DESCRIPTION",
    name: "Position Description Letter",
    description: "Formal position description for the nominated occupation including ANZSCO duties.",
  },
  {
    type: "LMT_SUMMARY",
    name: "LMT Summary Document",
    description: "Labour Market Testing compliance summary — advertising campaign, applications assessed.",
  },
  {
    type: "NOMINATION_COVER_LETTER",
    name: "Nomination Cover Letter",
    description: "Cover letter to DHA supporting the nomination including employer declarations.",
  },
  {
    type: "DOCUMENT_REQUEST_LETTER",
    name: "Document Request Letter",
    description: "Formal letter requesting outstanding documents from the employer or worker.",
  },
  {
    type: "CLIENT_WELCOME_LETTER",
    name: "Client Welcome Letter",
    description: "Professional welcome letter confirming engagement and outlining next steps.",
  },
  {
    type: "VISA_GRANT_NOTIFICATION",
    name: "Visa Grant Notification",
    description: "Congratulatory letter with visa details and key conditions.",
  },
  {
    type: "VISA_REFUSAL_LETTER",
    name: "Visa Refusal Letter",
    description: "Empathetic notification of refusal outcome with review options.",
  },
];

const PARTNER_DOCS: DocCardDef[] = [
  {
    type: "RELATIONSHIP_STATEMENT",
    name: "Relationship Statement Template",
    description: "Comprehensive statement covering all 4 DHA relationship categories with evidence guidance.",
  },
  {
    type: "COVER_LETTER_DHA",
    name: "Cover Letter to DHA",
    description: "Formal migration agent cover letter for the partner visa application package.",
  },
  {
    type: "CLIENT_WELCOME_LETTER",
    name: "Client Welcome Letter",
    description: "Professional welcome letter confirming engagement and outlining next steps.",
  },
  {
    type: "VISA_GRANT_NOTIFICATION",
    name: "Visa Grant Notification",
    description: "Congratulatory letter with visa details and key conditions.",
  },
  {
    type: "VISA_REFUSAL_LETTER",
    name: "Visa Refusal Letter",
    description: "Empathetic notification of refusal outcome with review options.",
  },
];

function getDocCards(visaSubclass: string): DocCardDef[] {
  const sub = visaSubclass?.trim();
  if (sub === "500") return SC500_DOCS;
  if (sub === "482") return SC482_DOCS;
  if (sub === "820" || sub === "309") return PARTNER_DOCS;
  return ALL_DOCS;
}

// ── GS form parser ────────────────────────────────────────────────────────────

interface GsSection {
  number: string;
  heading: string;
  answer: string;
}

function parseGsForm(content: string): GsSection[] {
  const sections: GsSection[] = [];
  // Split on lines that start with Q followed by a digit and period
  const parts = content.split(/(?=^Q\d+\.)/m);
  for (const part of parts) {
    const m = part.match(/^Q(\d+)\.\s+(.*?)(?:\n)([\s\S]*)/);
    if (m) {
      sections.push({
        number: m[1],
        heading: m[2].trim(),
        answer: m[3].trim(),
      });
    }
  }
  return sections;
}

// ── Pulsing dots ──────────────────────────────────────────────────────────────

function PulsingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ── Previously saved docs ─────────────────────────────────────────────────────

const DOC_TITLES: Record<string, string> = {
  GS_FORM_RESPONSES:       "GS Form Responses",
  GS_SUPPORTING_STATEMENT: "GS Supporting Statement",
  POSITION_DESCRIPTION:    "Position Description",
  LMT_SUMMARY:             "LMT Summary",
  NOMINATION_COVER_LETTER: "Nomination Cover Letter",
  RELATIONSHIP_STATEMENT:  "Relationship Statement",
  COVER_LETTER_DHA:        "Cover Letter to DHA",
  CLIENT_WELCOME_LETTER:   "Client Welcome Letter",
  DOCUMENT_REQUEST_LETTER: "Document Request Letter",
  VISA_GRANT_NOTIFICATION: "Visa Grant Notification",
  VISA_REFUSAL_LETTER:     "Visa Refusal Letter",
};

// ── Main component ────────────────────────────────────────────────────────────

export function AITools({
  caseId,
  caseContext,
  client,
  firm,
  agent,
  aiDocuments: initialAiDocs,
}: AIToolsProps) {
  const docCards = getDocCards(caseContext.visa_subclass);

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiDocs, setAiDocs] = useState(initialAiDocs);
  const [savedDocsOpen, setSavedDocsOpen] = useState(true);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const isGsForm = selectedType === "GS_FORM_RESPONSES";
  const gsSections = isGsForm && content ? parseGsForm(content) : [];
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const selectedCard = docCards.find((c) => c.type === selectedType);
  const today = format(new Date(), "d MMMM yyyy"); // "20 May 2026"

  // ── Usage tracking ─────────────────────────────────────────────────────────
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number; plan: string } | null>(null);

  useEffect(() => {
    fetch("/api/ai/usage")
      .then((r) => r.json())
      .then((json) => {
        if (typeof json.used === "number") {
          setUsage(json as { used: number; limit: number; remaining: number; plan: string });
        }
      })
      .catch(() => { /* silently ignore — usage indicator is non-critical */ });
  }, []);

  const limitReached = usage !== null && usage.remaining <= 0;

  // ── Generation ─────────────────────────────────────────────────────────────

  async function handleGenerate(docType: string) {
    setSelectedType(docType);
    setContent("");
    setError(null);
    setToast(null);
    setGenerating(true);

    try {
      const res = await fetch(`/api/cases/${caseId}/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: docType }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "Generation failed");
      }

      // Read the remaining count from the response header and update usage state
      const remainingHeader = res.headers.get("X-Remaining-Generations");
      if (remainingHeader !== null && usage) {
        const remaining = parseInt(remainingHeader, 10);
        setUsage((prev) =>
          prev ? { ...prev, used: prev.limit - remaining, remaining } : prev
        );
      } else if (usage) {
        // Optimistically decrement if header not available
        setUsage((prev) =>
          prev
            ? { ...prev, used: prev.used + 1, remaining: Math.max(0, prev.remaining - 1) }
            : prev
        );
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setContent(full);
      }

      showToast("Generation complete ✓");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  // ── Save to case ───────────────────────────────────────────────────────────

  async function handleSave() {
    if (!content || !selectedType) return;
    setSaving(true);
    try {
      const title = DOC_TITLES[selectedType] ?? selectedType;
      const res = await fetch(`/api/cases/${caseId}/ai/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: selectedType, title, content }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Save failed");

      // Prepend to saved list
      setAiDocs((prev) => [
        {
          id: (json as { id: string }).id,
          document_type: selectedType,
          title,
          content,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      showToast("Saved to case ✓");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── Download Word ──────────────────────────────────────────────────────────

  async function handleDownload() {
    if (!content || !selectedType) return;
    const title = DOC_TITLES[selectedType] ?? selectedType;
    await generateWordDoc({
      documentType: selectedType,
      title,
      content,
      firmName: firm.name,
      agentName: agent.full_name,
      agentMaraNumber: agent.mara_number ?? "",
      clientName: client.full_name,
      caseRefNumber: caseContext.ref_number ?? "",
      date: today,
    });
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Load saved doc ─────────────────────────────────────────────────────────

  function loadSaved(doc: (typeof aiDocs)[0]) {
    setSelectedType(doc.document_type);
    setContent(doc.content);
    setError(null);
    setToast(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-slate-500" />
          <div>
            <h2 className="text-base font-semibold text-slate-800">AI Document Generator</h2>
            <p className="text-sm text-slate-500">
              SC-{caseContext.visa_subclass} · {client.full_name}
            </p>
          </div>
        </div>

        {/* Usage indicator */}
        {usage && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              limitReached
                ? "border-red-200 bg-red-50 text-red-700"
                : usage.remaining <= Math.ceil(usage.limit * 0.1)
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            )}
          >
            <Zap className="h-3 w-3 shrink-0" />
            {limitReached ? (
              <span>Limit reached — {usage.used}/{usage.limit} this month</span>
            ) : (
              <span>{usage.used}/{usage.limit} generations used this month</span>
            )}
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">

        {/* ── Left: document selector ──────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-3">
            Select document
          </p>
          {docCards.map((card) => (
            <button
              key={card.type}
              type="button"
              onClick={() => !generating && !limitReached && handleGenerate(card.type)}
              disabled={generating || limitReached}
              className={cn(
                "w-full rounded-lg border p-3.5 text-left transition-all",
                selectedType === card.type
                  ? "border-[#0f172a] bg-[#0f172a] text-white shadow-md"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-semibold leading-snug",
                      selectedType === card.type ? "text-white" : "text-slate-800"
                    )}
                  >
                    {card.name}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs leading-relaxed",
                      selectedType === card.type ? "text-slate-300" : "text-slate-500"
                    )}
                  >
                    {card.description}
                  </p>
                </div>
                {generating && selectedType === card.type ? (
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-white" />
                ) : (
                  <Sparkles
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      selectedType === card.type ? "text-slate-300" : "text-slate-300"
                    )}
                  />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* ── Right: content area ───────────────────────────────────────────── */}
        <div className="min-w-0">
          {/* Empty state */}
          {!selectedType && !generating && (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white">
              {limitReached ? (
                <>
                  <Zap className="mb-3 h-8 w-8 text-red-300" />
                  <p className="text-sm font-medium text-red-500">
                    Monthly generation limit reached
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Upgrade your plan to generate more documents
                  </p>
                </>
              ) : (
                <>
                  <Sparkles className="mb-3 h-8 w-8 text-slate-200" />
                  <p className="text-sm font-medium text-slate-400">
                    Select a document type to generate
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    AI-drafted, ready for your review
                  </p>
                </>
              )}
            </div>
          )}

          {/* Generating state */}
          {selectedType && generating && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                <span className="text-sm font-medium text-slate-600">
                  Generating {selectedCard?.name ?? "document"}…
                </span>
                <PulsingDots />
              </div>
              {content && (
                <div className="mt-2 max-h-[400px] overflow-y-auto rounded border border-slate-100 bg-slate-50 p-4 font-mono text-xs text-slate-600 whitespace-pre-wrap">
                  {content}
                  <span className="inline-block h-3 w-1 animate-pulse bg-slate-400 ml-0.5 align-middle" />
                </div>
              )}
            </div>
          )}

          {/* Content ready */}
          {selectedType && !generating && content && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {selectedCard?.name ?? selectedType}
                  </h3>
                  <p className="text-xs text-slate-400">{wordCount} words</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    Save to Case
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-700"
                  >
                    <Download className="h-3 w-3" />
                    Download as Word (.docx)
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* GS form — labeled sections */}
              {isGsForm && gsSections.length > 0 ? (
                <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
                  {gsSections.map((section) => (
                    <div key={section.number} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Q{section.number}. {section.heading}
                      </p>
                      <textarea
                        className="w-full resize-none rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        rows={6}
                        value={section.answer}
                        onChange={(e) => {
                          // Update the answer for this section within the full content
                          const updated = gsSections.map((s) =>
                            s.number === section.number
                              ? { ...s, answer: e.target.value }
                              : s
                          );
                          const newContent = updated
                            .map((s) => `Q${s.number}. ${s.heading}\n${s.answer}`)
                            .join("\n\n");
                          setContent(newContent);
                        }}
                      />
                      <p className="mt-1 text-right text-[10px] text-slate-400">
                        {section.answer.trim().split(/\s+/).filter(Boolean).length} / 150 words
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                /* Standard editable textarea */
                <div className="rounded-lg border border-slate-200 bg-white">
                  <textarea
                    ref={contentRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full resize-none rounded-lg bg-white p-5 font-mono text-sm text-slate-800 focus:outline-none"
                    rows={Math.max(20, content.split("\n").length + 3)}
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error state (no content) */}
          {selectedType && !generating && !content && error && (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6">
              <AlertCircle className="mb-2 h-6 w-6 text-red-400" />
              <p className="text-sm font-medium text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => handleGenerate(selectedType)}
                className="mt-3 text-xs text-red-600 underline hover:text-red-800"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Previously saved documents ───────────────────────────────────── */}
      {aiDocs.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setSavedDocsOpen((p) => !p)}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">
                Previously Generated ({aiDocs.length})
              </span>
            </div>
            {savedDocsOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {savedDocsOpen && (
            <div className="border-t border-slate-100">
              {aiDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between border-b border-slate-50 px-4 py-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{doc.title}</p>
                    <p className="text-xs text-slate-400">
                      Generated{" "}
                      {format(new Date(doc.created_at), "d MMM yyyy, h:mm a")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadSaved(doc)}
                    className="ml-4 shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}
