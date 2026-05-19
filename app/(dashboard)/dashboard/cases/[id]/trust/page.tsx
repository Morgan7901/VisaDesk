import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CaseTrustLedger } from "@/components/cases/CaseTrustLedger";
import type { TrustTransaction } from "@/components/dashboard/TrustPage";


export default async function CaseTrustPage({
  params,
}: {
  params: { id: string };
}) {
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

  // Verify case belongs to firm
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id, ref_number, clients!client_id(full_name)")
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) redirect("/dashboard/cases");

  const arr = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const client = arr(caseRow.clients as { full_name: string } | { full_name: string }[] | null) as { full_name: string } | null;

  // Fetch transactions for this case only
  const { data: rawTx } = await supabaseAdmin
    .from("trust_transactions")
    .select("id, transaction_type, category, description, amount, invoice_number, receipt_url, created_at, case_id")
    .eq("case_id", params.id)
    .order("created_at", { ascending: false });

  const transactions: TrustTransaction[] = (rawTx ?? []).map((tx) => ({
    id: tx.id,
    transaction_type: tx.transaction_type,
    category: tx.category ?? null,
    description: tx.description,
    amount: parseFloat(tx.amount as unknown as string),
    invoice_number: tx.invoice_number ?? null,
    receipt_url: tx.receipt_url ?? null,
    created_at: tx.created_at,
    case_id: tx.case_id ?? null,
    ref_number: caseRow.ref_number ?? null,
    client_name: client?.full_name ?? null,
  }));

  const caseOption = {
    id: caseRow.id,
    ref_number: caseRow.ref_number ?? "",
    visa_subclass: "",
    client_name: client?.full_name ?? null,
  };

  return (
    <CaseTrustLedger
      caseId={params.id}
      transactions={transactions}
      prefillCase={caseOption}
    />
  );
}
