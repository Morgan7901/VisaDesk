import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
  const sessionClient = await createClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // When a specific sponsor ID is requested (prefill), return just that sponsor
  if (prefillId) {
    const { data: sponsors, error } = await supabaseAdmin
      .from("sponsors")
      .select("id, company_name, contact_name")
      .eq("firm_id", profile.firm_id)
      .eq("id", prefillId)
      .limit(1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(sponsors ?? []);
  }

  const { data: sponsors, error } = await supabaseAdmin
    .from("sponsors")
    .select("id, company_name, contact_name")
    .eq("firm_id", profile.firm_id)
    .ilike("company_name", `%${q}%`)
    .order("company_name")
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(sponsors ?? []);
}
