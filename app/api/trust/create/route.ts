import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  const firmId: string = profile.firm_id;

  const body = await request.json();
  const { transaction_type, category, case_id, description, amount, invoice_number } = body;

  if (!transaction_type || !description || !amount) {
    return NextResponse.json(
      { error: "transaction_type, description, and amount are required." },
      { status: 400 }
    );
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }

  // Verify case belongs to firm (if provided)
  if (case_id) {
    const { data: caseRow } = await supabaseAdmin
      .from("cases")
      .select("id")
      .eq("id", case_id)
      .eq("firm_id", firmId)
      .single();
    if (!caseRow) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }
  }

  // Ensure trust account exists (create if first use)
  const { data: account } = await supabaseAdmin
    .from("trust_accounts")
    .select("id, balance")
    .eq("firm_id", firmId)
    .single();

  let accountId: string;
  let currentBalance = 0;

  if (!account) {
    const { data: created, error: createErr } = await supabaseAdmin
      .from("trust_accounts")
      .insert({ firm_id: firmId, balance: 0 })
      .select("id, balance")
      .single();
    if (createErr || !created) {
      return NextResponse.json({ error: "Failed to initialise trust account." }, { status: 500 });
    }
    accountId = created.id;
    currentBalance = 0;
  } else {
    accountId = account.id;
    currentBalance = parseFloat(account.balance as unknown as string);
  }

  // Calculate new balance
  const delta = transaction_type === "credit" ? parsedAmount : -parsedAmount;
  const newBalance = currentBalance + delta;

  // Insert transaction
  const { data: transaction, error: txErr } = await supabaseAdmin
    .from("trust_transactions")
    .insert({
      firm_id: firmId,
      case_id: case_id ?? null,
      transaction_type,
      category: category ?? null,
      description,
      amount: parsedAmount,
      invoice_number: invoice_number ?? null,
      created_by: user.id,
    })
    .select("id, transaction_type, category, description, amount, invoice_number, created_at, case_id")
    .single();

  if (txErr || !transaction) {
    return NextResponse.json({ error: txErr?.message ?? "Failed to create transaction." }, { status: 500 });
  }

  // Update trust account balance
  const { error: balanceErr } = await supabaseAdmin
    .from("trust_accounts")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", accountId);

  if (balanceErr) {
    return NextResponse.json({ error: balanceErr.message }, { status: 500 });
  }

  return NextResponse.json({ transaction, newBalance });
}
