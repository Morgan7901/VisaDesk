import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  const { caseId, label, deadline_date, deadline_type } = await request.json();

  if (!caseId || !label || !deadline_date) {
    return NextResponse.json(
      { error: "caseId, label, and deadline_date are required." },
      { status: 400 }
    );
  }

  // RLS with check: firm_id = get_my_firm_id()
  const { error } = await supabase.from("deadlines").insert({
    case_id: caseId,
    firm_id: profile.firm_id,
    label,
    deadline_date,
    deadline_type: deadline_type ?? null,
    is_complete: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
