"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import { TrustLedger } from "@/components/dashboard/TrustPage";
import type { TrustTransaction, CaseOption } from "@/components/dashboard/TrustPage";
import { cn } from "@/lib/utils";

function fmt(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
}

interface Props {
  caseId: string;
  transactions: TrustTransaction[];
  prefillCase: CaseOption;
}

export function CaseTrustLedger({ transactions, prefillCase }: Props) {
  const [allTx, setAllTx] = useState<TrustTransaction[]>(transactions);

  // Running balance for this case only
  const balance = allTx.reduce(
    (sum, tx) => sum + (tx.transaction_type === "credit" ? tx.amount : -tx.amount),
    0
  );

  const handleCreated = (tx: TrustTransaction) => {
    setAllTx((prev) => [tx, ...prev]);
  };

  return (
    <div className="space-y-4">
      {/* Case balance summary */}
      <div className="flex items-center justify-between border border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <Scale className="h-5 w-5 text-slate-400" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Case Trust Balance</p>
            <p className={cn(
              "mt-0.5 text-xl font-bold tabular-nums",
              balance >= 0 ? "text-slate-900" : "text-red-700"
            )}>
              {fmt(balance)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Credits</p>
            <p className="font-semibold text-green-700 tabular-nums">
              {fmt(allTx.filter((t) => t.transaction_type === "credit").reduce((s, t) => s + t.amount, 0))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Debits</p>
            <p className="font-semibold text-red-700 tabular-nums">
              {fmt(allTx.filter((t) => t.transaction_type === "debit").reduce((s, t) => s + t.amount, 0))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Transactions</p>
            <p className="font-semibold text-slate-700 tabular-nums">{allTx.length}</p>
          </div>
        </div>
      </div>

      {/* Ledger table — case pre-filled, no firm-wide case column */}
      <div className="border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">Transaction Ledger</h2>
        </div>
        <TrustLedger
          transactions={allTx}
          showCase={false}
          cases={[]}
          prefillCase={prefillCase}
          onCreated={handleCreated}
        />
      </div>
    </div>
  );
}
