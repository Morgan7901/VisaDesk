import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the case belongs to this user's firm
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id")
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const { data: deadlines, error } = await supabaseAdmin
    .from("deadlines")
    .select("id, label, deadline_date, deadline_type, is_complete")
    .eq("case_id", params.id)
    .order("deadline_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deadlines: deadlines ?? [] });
}
