import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use service role client to bypass RLS on profiles — the session JWT may
  // not yet carry firm_id if the user just registered.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    console.error("[deadlines/create] profile has no firm_id for user:", user.id);
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  const { caseId, label, deadline_date, deadline_type } = await request.json();

  if (!caseId || !label || !deadline_date) {
    return NextResponse.json(
      { error: "caseId, label, and deadline_date are required." },
      { status: 400 }
    );
  }

  const { data: deadline, error } = await supabaseAdmin
    .from("deadlines")
    .insert({
      case_id: caseId,
      firm_id: profile.firm_id,
      label,
      deadline_date,
      deadline_type: deadline_type ?? null,
      is_complete: false,
    })
    .select("id, label, deadline_date, deadline_type, is_complete, case_id")
    .single();

  if (error || !deadline) {
    return NextResponse.json({ error: error?.message ?? "Insert failed." }, { status: 500 });
  }

  return NextResponse.json({ deadline });
}
