import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  const sessionClient = await createClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch firm_id via admin client to bypass RLS
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const prefillId = request.nextUrl.searchParams.get("id");

  // When a specific client ID is requested (prefill), return just that client
  if (prefillId) {
    const { data: clients, error } = await supabaseAdmin
      .from("clients")
      .select("id, full_name, email")
      .eq("firm_id", profile.firm_id)
      .eq("id", prefillId)
      .limit(1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(clients ?? []);
  }

  const { data: clients, error } = await supabaseAdmin
    .from("clients")
    .select("id, full_name, email")
    .eq("firm_id", profile.firm_id)
    .ilike("full_name", `%${q}%`)
    .order("full_name")
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(clients ?? []);
}
