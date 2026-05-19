"use client";

import { useMemo, useState } from "react";
import {
  format, parseISO, startOfMonth, endOfMonth, isWithinInterval,
} from "date-fns";
import {
  Plus, Search, TrendingUp, TrendingDown, Receipt, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrustTransaction {
  id: string;
  transaction_type: string;          // "credit" | "debit"
  category: string | null;           // "professional_fee" | "disbursement" | "refund"
  description: string;
  amount: number;
  invoice_number: string | null;
  receipt_url: string | null;
  created_at: string;
  case_id: string | null;
  ref_number: string | null;
  client_name: string | null;
}

export interface CaseOption {
  id: string;
  ref_number: string;
  visa_subclass: string;
  client_name: string | null;
}

interface Props {
  initialBalance: number;
  transactions: TrustTransaction[];
  cases: CaseOption[];
  /** When set, restrict to a single case (used in the case trust tab) */
  caseId?: string;
  prefillCase?: CaseOption;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Record<string, string> = {
  professional_fee: "Prof. Fee",
  disbursement:     "Disbursement",
  refund:           "Refund",
};

const CATEGORY_STYLES: Record<string, string> = {
  professional_fee: "bg-violet-50 text-violet-700",
  disbursement:     "bg-blue-50 text-blue-700",
  refund:           "bg-amber-50 text-amber-700",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
}

function runningBalances(txs: TrustTransaction[]): number[] {
  // txs are newest-first; compute running balance newest → oldest
  // then reverse so index 0 = oldest running balance
  let running = 0;
  const arr = [...txs].reverse().map((tx) => {
    running += tx.transaction_type === "credit" ? tx.amount : -tx.amount;
    return running;
  });
  return arr.reverse(); // back to newest-first order
}

// ─── New Transaction Modal ────────────────────────────────────────────────────

function NewTransactionModal({
  cases,
  prefillCase,
  onClose,
  onCreated,
}: {
  cases: CaseOption[];
  prefillCase?: CaseOption;
  onClose: () => void;
  onCreated: (tx: TrustTransaction, newBalance: number) => void;
}) {
  const [type, setType]             = useState<"credit" | "debit">("credit");
  const [category, setCategory]     = useState("professional_fee");
  const [description, setDesc]      = useState("");
  const [amount, setAmount]         = useState("");
  const [invoiceNo, setInvoiceNo]   = useState("");
  const [caseSearch, setCaseSearch] = useState("");
  const [selectedCase, setSelectedCase] = useState<CaseOption | null>(prefillCase ?? null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const filteredCases = useMemo(() => {
    const q = caseSearch.toLowerCase();
    if (!q) return cases.slice(0, 8);
    return cases.filter(
      (c) =>
        c.ref_number.toLowerCase().includes(q) ||
        (c.client_name ?? "").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [cases, caseSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!description || isNaN(parsed) || parsed <= 0) {
      setError("Description and a positive amount are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch("/api/trust/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_type: type,
        category,
        case_id: selectedCase?.id ?? null,
        description,
        amount: parsed,
        invoice_number: invoiceNo.trim() || null,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to create transaction.");
      setSaving(false);
      return;
    }

    const tx: TrustTransaction = {
      ...json.transaction,
      amount: parseFloat(json.transaction.amount),
      ref_number: selectedCase?.ref_number ?? null,
      client_name: selectedCase?.client_name ?? null,
    };
    onCreated(tx, json.newBalance);
    onClose();
  };

  const inputCls = "w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">New Transaction</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          {/* Type toggle */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Type</label>
            <div className="flex border border-slate-300 overflow-hidden">
              {(["credit", "debit"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 py-2 text-sm font-semibold capitalize transition-colors",
                    type === t
                      ? t === "credit"
                        ? "bg-green-600 text-white"
                        : "bg-red-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {t === "credit" ? "↑ Credit" : "↓ Debit"}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              <option value="professional_fee">Professional Fee</option>
              <option value="disbursement">Disbursement</option>
              <option value="refund">Refund</option>
            </select>
          </div>

          {/* Case selector (hidden if prefilled) */}
          {!prefillCase && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Case (optional)</label>
              {selectedCase ? (
                <div className="flex items-center justify-between border border-slate-300 px-3 py-2 text-sm">
                  <span className="text-slate-800">{selectedCase.ref_number} — {selectedCase.client_name ?? "Unknown"}</span>
                  <button type="button" onClick={() => { setSelectedCase(null); setCaseSearch(""); }}
                    className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={caseSearch}
                    onChange={(e) => setCaseSearch(e.target.value)}
                    placeholder="Search by ref or client…"
                    className={cn(inputCls, "pl-8")}
                  />
                  {caseSearch && filteredCases.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full border border-slate-200 bg-white shadow-md max-h-40 overflow-y-auto">
                      {filteredCases.map((c) => (
                        <li key={c.id}>
                          <button type="button" onClick={() => { setSelectedCase(c); setCaseSearch(""); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                            <span className="font-medium text-slate-800">{c.ref_number}</span>
                            <span className="ml-2 text-slate-500">{c.client_name ?? "Unknown"}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          {prefillCase && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Case</label>
              <div className="border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {prefillCase.ref_number} — {prefillCase.client_name ?? "Unknown"}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Description *</label>
            <input type="text" value={description} onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Visa application filing fee" className={inputCls} required />
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Amount (AUD) *</label>
            <input type="number" min="0.01" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" className={inputCls} required />
          </div>

          {/* Invoice number */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Invoice Number (optional)</label>
            <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="INV-001" className={inputCls} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className={cn(
                "px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50",
                type === "credit" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              )}>
              {saving ? "Saving…" : `Add ${type === "credit" ? "Credit" : "Debit"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function TxRow({
  tx,
  runningBalance,
  showCase,
}: {
  tx: TrustTransaction;
  runningBalance: number;
  showCase: boolean;
}) {
  const isCredit = tx.transaction_type === "credit";

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
        {format(parseISO(tx.created_at), "dd/MM/yyyy")}
      </td>
      <td className="px-4 py-3 text-sm text-slate-800 max-w-[200px]">
        <p className="truncate">{tx.description}</p>
      </td>
      {showCase && (
        <td className="px-4 py-3 whitespace-nowrap">
          {tx.case_id ? (
            <a href={`/dashboard/cases/${tx.case_id}`}
              className="text-xs text-slate-600 hover:underline font-mono">
              {tx.ref_number ?? "—"}
            </a>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
          {tx.client_name && (
            <p className="text-xs text-slate-400 truncate max-w-[120px]">{tx.client_name}</p>
          )}
        </td>
      )}
      <td className="px-4 py-3 whitespace-nowrap">
        {tx.category ? (
          <span className={cn(
            "inline-block px-2 py-0.5 text-xs font-medium",
            CATEGORY_STYLES[tx.category] ?? "bg-slate-100 text-slate-600"
          )}>
            {CATEGORIES[tx.category] ?? tx.category}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={cn(
          "inline-block px-2 py-0.5 text-xs font-semibold uppercase",
          isCredit ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        )}>
          {isCredit ? "Credit" : "Debit"}
        </span>
      </td>
      <td className={cn(
        "px-4 py-3 text-sm font-semibold tabular-nums whitespace-nowrap text-right",
        isCredit ? "text-green-700" : "text-red-700"
      )}>
        {isCredit ? "+" : "−"}{fmt(tx.amount)}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
        {tx.invoice_number ?? <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3 text-sm font-medium tabular-nums whitespace-nowrap text-right text-slate-700">
        {fmt(runningBalance)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {tx.receipt_url ? (
          <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors">
            <Receipt className="h-3.5 w-3.5" />
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

// ─── Ledger table (shared by both pages) ─────────────────────────────────────

export function TrustLedger({
  transactions,
  showCase = true,
  cases = [],
  prefillCase,
  onCreated,
}: {
  transactions: TrustTransaction[];
  showCase?: boolean;
  cases?: CaseOption[];
  prefillCase?: CaseOption;
  onCreated?: (tx: TrustTransaction, newBalance: number) => void;
}) {
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [catFilter, setCatFilter]   = useState("");
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");
  const [modalOpen, setModalOpen]   = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter((tx) => {
      if (typeFilter && tx.transaction_type !== typeFilter) return false;
      if (catFilter && tx.category !== catFilter) return false;
      if (q &&
        !tx.description.toLowerCase().includes(q) &&
        !(tx.client_name ?? "").toLowerCase().includes(q) &&
        !(tx.invoice_number ?? "").toLowerCase().includes(q)) return false;
      if (fromDate && tx.created_at < fromDate) return false;
      if (toDate && tx.created_at > toDate + "T23:59:59") return false;
      return true;
    });
  }, [transactions, search, typeFilter, catFilter, fromDate, toDate]);

  const balances = useMemo(() => runningBalances(filtered), [filtered]);

  // Totals for the filtered view
  const totalCredits = filtered.filter((t) => t.transaction_type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalDebits  = filtered.filter((t) => t.transaction_type === "debit").reduce((s, t) => s + t.amount, 0);
  const net = totalCredits - totalDebits;

  const selectCls = "border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, client, or invoice…"
            className="w-full border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500" />
        </div>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
          <option value="">All types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>

        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={selectCls}>
          <option value="">All categories</option>
          <option value="professional_fee">Professional Fee</option>
          <option value="disbursement">Disbursement</option>
          <option value="refund">Refund</option>
        </select>

        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          className={cn(selectCls, "text-xs")} placeholder="From" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
          className={cn(selectCls, "text-xs")} placeholder="To" />

        <button onClick={() => setModalOpen(true)}
          className="ml-auto flex items-center gap-1.5 bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors">
          <Plus className="h-4 w-4" />
          New Transaction
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400">
          <Receipt className="h-7 w-7" />
          <p className="text-sm">{transactions.length === 0 ? "No transactions yet." : "No transactions match your filters."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left bg-slate-50">
                {["Date", "Description", ...(showCase ? ["Case / Client"] : []), "Category", "Type", "Amount", "Invoice #", "Balance", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx, i) => (
                <TxRow key={tx.id} tx={tx} runningBalance={balances[i]} showCase={showCase} />
              ))}
            </tbody>
            {/* Totals footer */}
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td colSpan={showCase ? 5 : 4} className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wide">
                  Filtered totals
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <span className="text-green-700">+{fmt(totalCredits)}</span>
                  <span className="mx-1 text-slate-300">|</span>
                  <span className="text-red-700">−{fmt(totalDebits)}</span>
                  <span className="mx-1 text-slate-300">|</span>
                  <span className={net >= 0 ? "text-slate-800" : "text-red-700"}>{fmt(net)}</span>
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {modalOpen && (
        <NewTransactionModal
          cases={cases}
          prefillCase={prefillCase}
          onClose={() => setModalOpen(false)}
          onCreated={(tx, bal) => { onCreated?.(tx, bal); setModalOpen(false); }}
        />
      )}
    </>
  );
}

// ─── Summary stat card ────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", accent ?? "text-slate-900")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── Main full-page component ─────────────────────────────────────────────────

export function TrustPage({ initialBalance, transactions, cases }: Props) {
  const [balance, setBalance]       = useState(initialBalance);
  const [allTx, setAllTx]           = useState<TrustTransaction[]>(transactions);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd   = endOfMonth(now);

  const thisMonth = useMemo(() =>
    allTx.filter((tx) =>
      isWithinInterval(parseISO(tx.created_at), { start: monthStart, end: monthEnd })
    ),
    [allTx, monthStart, monthEnd]
  );

  const monthCredits = thisMonth.filter((t) => t.transaction_type === "credit").reduce((s, t) => s + t.amount, 0);
  const monthDebits  = thisMonth.filter((t) => t.transaction_type === "debit").reduce((s, t) => s + t.amount, 0);

  const handleCreated = (tx: TrustTransaction, newBalance: number) => {
    setAllTx((prev) => [tx, ...prev]);
    setBalance(newBalance);
  };

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Trust Balance"
          value={fmt(balance)}
          sub="Current balance"
          accent={balance >= 0 ? "text-slate-900" : "text-red-700"}
        />
        <StatCard
          label="Credits This Month"
          value={fmt(monthCredits)}
          sub={`${thisMonth.filter((t) => t.transaction_type === "credit").length} transactions`}
          accent="text-green-700"
        />
        <StatCard
          label="Debits This Month"
          value={fmt(monthDebits)}
          sub={`${thisMonth.filter((t) => t.transaction_type === "debit").length} transactions`}
          accent="text-red-700"
        />
        <StatCard
          label="Transactions"
          value={String(thisMonth.length)}
          sub="This month"
        />
      </div>

      {/* Ledger */}
      <div className="bg-white border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">Transaction Ledger</h2>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-xs text-slate-500">Credits</span>
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-xs text-slate-500">Debits</span>
          </div>
        </div>

        <TrustLedger
          transactions={allTx}
          showCase
          cases={cases}
          onCreated={handleCreated}
        />
      </div>
    </div>
  );
}
