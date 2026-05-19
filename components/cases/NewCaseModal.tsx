"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Search, UserPlus, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const VISA_SUBCLASSES = [
  { value: "500", label: "500 — Student" },
  { value: "482", label: "482 — Temporary Skill Shortage" },
  { value: "186", label: "186 — Employer Nomination Scheme" },
  { value: "820", label: "820 — Partner (Onshore)" },
  { value: "189", label: "189 — Skilled Independent" },
  { value: "190", label: "190 — Skilled Nominated" },
  { value: "494", label: "494 — Skilled Employer Sponsored Regional" },
];

const VISA_STREAMS_482 = [
  { value: "short-term", label: "Short-Term Stream" },
  { value: "medium-term", label: "Medium-Term Stream" },
];

interface ClientOption {
  id: string;
  full_name: string;
  email: string | null;
}

interface NewClientFields {
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
}

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, pre-selects a client by ID (used from the client profile page) */
  prefillClientId?: string;
}

export function NewCaseModal({ isOpen, onClose, prefillClientId }: NewCaseModalProps) {
  const router = useRouter();

  // Client selection state
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClient, setNewClient] = useState<NewClientFields>({
    full_name: "", email: "", phone: "", nationality: "",
  });

  // Case fields
  const [visaSubclass, setVisaSubclass] = useState("");
  const [visaStream, setVisaStream] = useState("");
  const [notes, setNotes] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Escape key + body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Click-outside for client dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced client search
  useEffect(() => {
    if (isNewClient || !clientQuery.trim()) {
      setClientResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/clients/search?q=${encodeURIComponent(clientQuery)}`
        );
        const data = await res.json();
        setClientResults(Array.isArray(data) ? data : []);
        setShowDropdown(true);
      } catch {
        /* silent */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientQuery, isNewClient]);

  // Reset form when modal closes; pre-fill client when prefillClientId is set
  useEffect(() => {
    if (!isOpen) {
      setClientQuery(""); setClientResults([]); setShowDropdown(false);
      setSelectedClient(null); setIsNewClient(false);
      setNewClient({ full_name: "", email: "", phone: "", nationality: "" });
      setVisaSubclass(""); setVisaStream(""); setNotes("");
      setError(null); setIsSubmitting(false);
      return;
    }
    if (prefillClientId) {
      fetch(`/api/clients/search?q=&id=${prefillClientId}`)
        .then((r) => r.json())
        .then((data) => {
          // search route returns array; find by id if present, else use first
          const list: ClientOption[] = Array.isArray(data) ? data : [];
          const match = list.find((c) => c.id === prefillClientId) ?? list[0] ?? null;
          if (match) {
            setSelectedClient(match);
            setClientQuery(match.full_name);
          }
        })
        .catch(() => {/* silent */});
    }
  }, [isOpen, prefillClientId]);

  const selectClient = (c: ClientOption) => {
    setSelectedClient(c);
    setClientQuery(c.full_name);
    setShowDropdown(false);
    setIsNewClient(false);
  };

  const switchToNewClient = () => {
    setIsNewClient(true);
    setSelectedClient(null);
    setClientQuery("");
    setShowDropdown(false);
  };

  const clearClient = () => {
    setSelectedClient(null);
    setIsNewClient(false);
    setClientQuery("");
  };

  const handleSubmit = async () => {
    setError(null);

    if (!isNewClient && !selectedClient) {
      setError("Please select or create a client."); return;
    }
    if (isNewClient && !newClient.full_name.trim()) {
      setError("Client name is required."); return;
    }
    if (!visaSubclass) {
      setError("Please select a visa subclass."); return;
    }
    if (visaSubclass === "482" && !visaStream) {
      setError("Please select a visa stream for SC-482."); return;
    }

    setIsSubmitting(true);

    const res = await fetch("/api/cases/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: !isNewClient ? selectedClient?.id : undefined,
        newClient: isNewClient ? newClient : undefined,
        visaSubclass,
        visaStream: visaSubclass === "482" ? visaStream : undefined,
        notes: notes.trim() || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      setError(data.error ?? "Failed to create case.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/dashboard/cases/${data.caseId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">New Case</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Client ───────────────────────────────────────────── */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Client <span className="text-red-500">*</span>
            </label>

            {!isNewClient ? (
              <div ref={dropdownRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={clientQuery}
                    onChange={(e) => {
                      setClientQuery(e.target.value);
                      if (selectedClient) setSelectedClient(null);
                    }}
                    onFocus={() => {
                      if (clientResults.length) setShowDropdown(true);
                    }}
                    placeholder="Search existing clients…"
                    className={cn(
                      "w-full border py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400",
                      "focus:outline-none focus:ring-1",
                      selectedClient
                        ? "border-blue-400 bg-blue-50 focus:border-blue-500 focus:ring-blue-500"
                        : "border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                    )}
                    readOnly={!!selectedClient}
                  />
                  {selectedClient && (
                    <button
                      onClick={clearClient}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {showDropdown && (
                  <div className="absolute z-20 mt-1 w-full border border-slate-200 bg-white shadow-lg">
                    {clientResults.length > 0 && (
                      <ul>
                        {clientResults.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onMouseDown={() => selectClient(c)}
                              className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-slate-50"
                            >
                              <span className="text-sm font-medium text-slate-800">
                                {c.full_name}
                              </span>
                              {c.email && (
                                <span className="text-xs text-slate-400">{c.email}</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {clientResults.length === 0 && clientQuery.length > 0 && (
                      <p className="px-4 py-2.5 text-sm text-slate-400">
                        No clients found.
                      </p>
                    )}
                    <button
                      type="button"
                      onMouseDown={switchToNewClient}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      Create new client
                    </button>
                  </div>
                )}

                {!showDropdown && !selectedClient && (
                  <button
                    type="button"
                    onClick={switchToNewClient}
                    className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Or create a new client
                  </button>
                )}
              </div>
            ) : (
              /* ── New client inline fields ── */
              <div className="border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                    New Client
                  </p>
                  <button
                    type="button"
                    onClick={clearClient}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newClient.full_name}
                      onChange={(e) =>
                        setNewClient((p) => ({ ...p, full_name: e.target.value }))
                      }
                      placeholder="Jane Smith"
                      className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newClient.email}
                      onChange={(e) =>
                        setNewClient((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="jane@example.com"
                      className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) =>
                        setNewClient((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="+61 4xx xxx xxx"
                      className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Nationality
                    </label>
                    <input
                      type="text"
                      value={newClient.nationality}
                      onChange={(e) =>
                        setNewClient((p) => ({ ...p, nationality: e.target.value }))
                      }
                      placeholder="e.g. Chinese"
                      className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Visa Subclass ─────────────────────────────────────── */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Visa Subclass <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={visaSubclass}
                onChange={(e) => {
                  setVisaSubclass(e.target.value);
                  setVisaStream("");
                }}
                className="w-full appearance-none border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                <option value="">Select subclass…</option>
                {VISA_SUBCLASSES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* ── Visa Stream — 482 only ────────────────────────────── */}
          {visaSubclass === "482" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Visa Stream <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={visaStream}
                  onChange={(e) => setVisaStream(e.target.value)}
                  className="w-full appearance-none border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  <option value="">Select stream…</option>
                  {VISA_STREAMS_482.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          )}

          {/* ── Notes ────────────────────────────────────────────── */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional initial notes…"
              className="w-full resize-none border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-[#0f172a] px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Creating…" : "Create Case"}
          </button>
        </div>
      </div>
    </div>
  );
}
