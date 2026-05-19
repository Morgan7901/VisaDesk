import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TrustPage } from "@/components/dashboard/TrustPage";
import type { TrustTransaction, CaseOption } from "@/components/dashboard/TrustPage";

export const metadata: Metadata = { title: "Trust Accounting — VisaDesk" };


export default async function TrustPageRoute() {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) redirect("/login");

  const firmId: string = profile.firm_id;

  const arr = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  // Trust account balance
  const { data: account } = await supabaseAdmin
    .from("trust_accounts")
    .select("balance")
    .eq("firm_id", firmId)
    .single();

  const trustBalance = parseFloat((account?.balance ?? 0) as unknown as string);

  // All transactions with case + client info
  const { data: rawTx } = await supabaseAdmin
    .from("trust_transactions")
    .select(
      `id, transaction_type, category, description, amount,
       invoice_number, receipt_url, created_at, case_id,
       cases(id, ref_number, clients!client_id(full_name))`
    )
    .eq("firm_id", firmId)
    .order("created_at", { ascending: false });

  type RawCase = {
    id: string;
    ref_number: string | null;
    clients: { full_name: string } | { full_name: string }[] | null;
  };

  const transactions: TrustTransaction[] = (rawTx ?? []).map((tx) => {
    const caseRow = arr(tx.cases as RawCase | RawCase[] | null);
    const client  = arr(caseRow?.clients ?? null) as { full_name: string } | null;
    return {
      id: tx.id,
      transaction_type: tx.transaction_type,
      category: tx.category ?? null,
      description: tx.description,
      amount: parseFloat(tx.amount as unknown as string),
      invoice_number: tx.invoice_number ?? null,
      receipt_url: tx.receipt_url ?? null,
      created_at: tx.created_at,
      case_id: tx.case_id ?? null,
      ref_number: caseRow?.ref_number ?? null,
      client_name: client?.full_name ?? null,
    };
  });

  // Active cases for the modal case selector
  const { data: rawCases } = await supabaseAdmin
    .from("cases")
    .select("id, ref_number, visa_subclass, clients!client_id(full_name)")
    .eq("firm_id", firmId)
    .in("status", ["active", "submitted"])
    .order("ref_number", { ascending: true });

  const cases: CaseOption[] = (rawCases ?? []).map((c) => {
    const client = arr(c.clients as { full_name: string } | { full_name: string }[] | null) as { full_name: string } | null;
    return {
      id: c.id,
      ref_number: c.ref_number ?? "",
      visa_subclass: c.visa_subclass,
      client_name: client?.full_name ?? null,
    };
  });

  return (
    <TrustPage
      initialBalance={trustBalance}
      transactions={transactions}
      cases={cases}
    />
  );
}
