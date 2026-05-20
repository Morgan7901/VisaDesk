"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Search, UserPlus, Building2, Loader2, AlertCircle, ChevronDown } from "lucide-react";
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

const SPONSOR_VISA_SUBCLASSES = ["482", "186", "494"];

interface ClientOption {
  id: string;
  full_name: string;
  email: string | null;
}

interface SponsorOption {
  id: string;
  company_name: string;
  contact_name: string | null;
}

interface NewClientFields {
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
}

interface NewSponsorFields {
  company_name: string;
  abn: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
}

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, pre-selects a client by ID (used from the client profile page) */
  prefillClientId?: string;
  /** When set, pre-selects a sponsor by ID (used from the sponsor profile page) */
  prefillSponsorId?: string;
}

export function NewCaseModal({ isOpen, onClose, prefillClientId, prefillSponsorId }: NewCaseModalProps) {
  const router = useRouter();

  // Client selection state
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientOption[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClient, setNewClient] = useState<NewClientFields>({
    full_name: "", email: "", phone: "", nationality: "",
  });

  // Sponsor selection state
  const [sponsorQuery, setSponsorQuery] = useState("");
  const [sponsorResults, setSponsorResults] = useState<SponsorOption[]>([]);
  const [showSponsorDropdown, setShowSponsorDropdown] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<SponsorOption | null>(null);
  const [isNewSponsor, setIsNewSponsor] = useState(false);
  const [newSponsor, setNewSponsor] = useState<NewSponsorFields>({
    company_name: "", abn: "", contact_name: "", contact_email: "", contact_phone: "",
  });

  // Case fields
  const [visaSubclass, setVisaSubclass] = useState("");
  const [visaStream, setVisaStream] = useState("");
  const [notes, setNotes] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const sponsorDropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const requiresSponsor = SPONSOR_VISA_SUBCLASSES.includes(visaSubclass);

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
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Click-outside for sponsor dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sponsorDropdownRef.current && !sponsorDropdownRef.current.contains(e.target as Node)) {
        setShowSponsorDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced client search
  useEffect(() => {
    if (isNewClient || !clientQuery.trim()) {
      setClientResults([]);
      setShowClientDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/clients/search?q=${encodeURIComponent(clientQuery)}`
        );
        const data = await res.json();
        setClientResults(Array.isArray(data) ? data : []);
        setShowClientDropdown(true);
      } catch {
        /* silent */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientQuery, isNewClient]);

  // Debounced sponsor search
  useEffect(() => {
    if (isNewSponsor || !sponsorQuery.trim()) {
      setSponsorResults([]);
      setShowSponsorDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/sponsors/search?q=${encodeURIComponent(sponsorQuery)}`
        );
        const data = await res.json();
        setSponsorResults(Array.isArray(data) ? data : []);
        setShowSponsorDropdown(true);
      } catch {
        /* silent */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [sponsorQuery, isNewSponsor]);

  // Reset form when modal closes; pre-fill client/sponsor when prefill IDs are set
  useEffect(() => {
    if (!isOpen) {
      setClientQuery(""); setClientResults([]); setShowClientDropdown(false);
      setSelectedClient(null); setIsNewClient(false);
      setNewClient({ full_name: "", email: "", phone: "", nationality: "" });
      setSponsorQuery(""); setSponsorResults([]); setShowSponsorDropdown(false);
      setSelectedSponsor(null); setIsNewSponsor(false);
      setNewSponsor({ company_name: "", abn: "", contact_name: "", contact_email: "", contact_phone: "" });
      setVisaSubclass(""); setVisaStream(""); setNotes(""); setTemplateId(null);
      setError(null); setIsSubmitting(false);
      return;
    }
    if (prefillClientId) {
      fetch(`/api/clients/search?q=&id=${prefillClientId}`)
        .then((r) => r.json())
        .then((data) => {
          const list: ClientOption[] = Array.isArray(data) ? data : [];
          const match = list.find((c) => c.id === prefillClientId) ?? list[0] ?? null;
          if (match) {
            setSelectedClient(match);
            setClientQuery(match.full_name);
          }
        })
        .catch(() => {/* silent */});
    }
    if (prefillSponsorId) {
      fetch(`/api/sponsors/search?q=&id=${prefillSponsorId}`)
        .then((r) => r.json())
        .then((data) => {
          const list: SponsorOption[] = Array.isArray(data) ? data : [];
          const match = list.find((s) => s.id === prefillSponsorId) ?? list[0] ?? null;
          if (match) {
            setSelectedSponsor(match);
            setSponsorQuery(match.company_name);
          }
        })
        .catch(() => {/* silent */});
    }
  }, [isOpen, prefillClientId, prefillSponsorId]);

  // Fetch system default template when visa subclass changes
  useEffect(() => {
    if (!visaSubclass) { setTemplateId(null); return; }
    fetch(`/api/case-templates/default?visa_subclass=${visaSubclass}`)
      .then(r => r.json())
      .then(data => {
        console.log("[NewCaseModal] template fetch result:", { visaSubclass, data });
        if (data?.id) setTemplateId(data.id); else setTemplateId(null);
      })
      .catch(() => {}); // silently ignore — template is optional
  }, [visaSubclass]);

  const selectClient = (c: ClientOption) => {
    setSelectedClient(c);
    setClientQuery(c.full_name);
    setShowClientDropdown(false);
    setIsNewClient(false);
  };

  const switchToNewClient = () => {
    setIsNewClient(true);
    setSelectedClient(null);
    setClientQuery("");
    setShowClientDropdown(false);
  };

  const clearClient = () => {
    setSelectedClient(null);
    setIsNewClient(false);
    setClientQuery("");
  };

  const selectSponsor = (s: SponsorOption) => {
    setSelectedSponsor(s);
    setSponsorQuery(s.company_name);
    setShowSponsorDropdown(false);
    setIsNewSponsor(false);
  };

  const switchToNewSponsor = () => {
    setIsNewSponsor(true);
    setSelectedSponsor(null);
    setSponsorQuery("");
    setShowSponsorDropdown(false);
  };

  const clearSponsor = () => {
    setSelectedSponsor(null);
    setIsNewSponsor(false);
    setSponsorQuery("");
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
    if (requiresSponsor && !isNewSponsor && !selectedSponsor) {
      setError("A sponsor is required for this visa subclass."); return;
    }
    if (requiresSponsor && isNewSponsor && !newSponsor.company_name.trim()) {
      setError("Sponsor company name is required."); return;
    }

    setIsSubmitting(true);

    // If creating a new sponsor, create it first
    let resolvedSponsorId: string | undefined = undefined;
    if (requiresSponsor) {
      if (isNewSponsor) {
        const sponsorRes = await fetch("/api/sponsors/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_name: newSponsor.company_name.trim(),
            abn: newSponsor.abn.trim() || undefined,
            contact_name: newSponsor.contact_name.trim() || undefined,
            contact_email: newSponsor.contact_email.trim() || undefined,
            contact_phone: newSponsor.contact_phone.trim() || undefined,
          }),
        });
        const sponsorData = await sponsorRes.json();
        if (!sponsorRes.ok || sponsorData.error) {
          setError(sponsorData.error ?? "Failed to create sponsor.");
          setIsSubmitting(false);
          return;
        }
        resolvedSponsorId = sponsorData.id;
      } else if (selectedSponsor) {
        resolvedSponsorId = selectedSponsor.id;
      }
    }

    console.log("[NewCaseModal] submitting case:", {
      visaSubclass,
      templateId,
      hasClientId: !isNewClient && !!selectedClient?.id,
      hasNewClient: isNewClient,
    });

    const res = await fetch("/api/cases/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: !isNewClient ? selectedClient?.id : undefined,
        newClient: isNewClient ? newClient : undefined,
        visaSubclass,
        visaStream: visaSubclass === "482" ? visaStream : undefined,
        notes: notes.trim() || undefined,
        sponsorId: resolvedSponsorId,
        templateId: templateId ?? undefined,
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
              <div ref={clientDropdownRef} className="relative">
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
                      if (clientResults.length) setShowClientDropdown(true);
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

                {showClientDropdown && (
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

                {!showClientDropdown && !selectedClient && (
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
                  // Clear sponsor if moving away from sponsor-required subclass
                  if (!SPONSOR_VISA_SUBCLASSES.includes(e.target.value)) {
                    clearSponsor();
                  }
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

          {/* ── Sponsor — 482/186/494 only ────────────────────────── */}
          {requiresSponsor && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Sponsor <span className="text-red-500">*</span>
              </label>

              {!isNewSponsor ? (
                <div ref={sponsorDropdownRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={sponsorQuery}
                      onChange={(e) => {
                        setSponsorQuery(e.target.value);
                        if (selectedSponsor) setSelectedSponsor(null);
                      }}
                      onFocus={() => {
                        if (sponsorResults.length) setShowSponsorDropdown(true);
                      }}
                      placeholder="Search existing sponsors…"
                      className={cn(
                        "w-full border py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400",
                        "focus:outline-none focus:ring-1",
                        selectedSponsor
                          ? "border-blue-400 bg-blue-50 focus:border-blue-500 focus:ring-blue-500"
                          : "border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      )}
                      readOnly={!!selectedSponsor}
                    />
                    {selectedSponsor && (
                      <button
                        onClick={clearSponsor}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {showSponsorDropdown && (
                    <div className="absolute z-20 mt-1 w-full border border-slate-200 bg-white shadow-lg">
                      {sponsorResults.length > 0 && (
                        <ul>
                          {sponsorResults.map((s) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                onMouseDown={() => selectSponsor(s)}
                                className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-slate-50"
                              >
                                <span className="text-sm font-medium text-slate-800">
                                  {s.company_name}
                                </span>
                                {s.contact_name && (
                                  <span className="text-xs text-slate-400">{s.contact_name}</span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {sponsorResults.length === 0 && sponsorQuery.length > 0 && (
                        <p className="px-4 py-2.5 text-sm text-slate-400">
                          No sponsors found.
                        </p>
                      )}
                      <button
                        type="button"
                        onMouseDown={switchToNewSponsor}
                        className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        <Building2 className="h-4 w-4" />
                        Create new sponsor
                      </button>
                    </div>
                  )}

                  {!showSponsorDropdown && !selectedSponsor && (
                    <button
                      type="button"
                      onClick={switchToNewSponsor}
                      className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      Or create a new sponsor
                    </button>
                  )}
                </div>
              ) : (
                /* ── New sponsor inline fields ── */
                <div className="border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                      New Sponsor
                    </p>
                    <button
                      type="button"
                      onClick={clearSponsor}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Company name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newSponsor.company_name}
                        onChange={(e) =>
                          setNewSponsor((p) => ({ ...p, company_name: e.target.value }))
                        }
                        placeholder="Acme Pty Ltd"
                        className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        ABN
                      </label>
                      <input
                        type="text"
                        value={newSponsor.abn}
                        onChange={(e) =>
                          setNewSponsor((p) => ({ ...p, abn: e.target.value }))
                        }
                        placeholder="12 345 678 901"
                        className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Contact name
                      </label>
                      <input
                        type="text"
                        value={newSponsor.contact_name}
                        onChange={(e) =>
                          setNewSponsor((p) => ({ ...p, contact_name: e.target.value }))
                        }
                        placeholder="John Smith"
                        className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Contact email
                      </label>
                      <input
                        type="email"
                        value={newSponsor.contact_email}
                        onChange={(e) =>
                          setNewSponsor((p) => ({ ...p, contact_email: e.target.value }))
                        }
                        placeholder="hr@acme.com"
                        className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Contact phone
                      </label>
                      <input
                        type="tel"
                        value={newSponsor.contact_phone}
                        onChange={(e) =>
                          setNewSponsor((p) => ({ ...p, contact_phone: e.target.value }))
                        }
                        placeholder="+61 2 xxxx xxxx"
                        className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </div>
                  </div>
                </div>
              )}
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
