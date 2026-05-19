import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";


export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
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

  const { data: transaction, error } = await supabaseAdmin
    .from("trust_transactions")
    .select(
      `id, transaction_type, category, description, amount, invoice_number,
       receipt_url, created_at,
       cases(id, ref_number, clients!client_id(full_name))`
    )
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (error || !transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  return NextResponse.json({ transaction });
}
