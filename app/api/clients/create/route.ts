import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";


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

  const body = await request.json();
  const { full_name, email, phone, nationality } = body;

  if (!full_name?.trim()) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }

  const { data: client, error } = await supabaseAdmin
    .from("clients")
    .insert({
      firm_id: profile.firm_id,
      full_name: full_name.trim(),
      email: email ?? null,
      phone: phone ?? null,
      nationality: nationality ?? null,
    })
    .select("id")
    .single();

  if (error || !client) {
    return NextResponse.json({ error: error?.message ?? "Failed to create client." }, { status: 500 });
  }

  return NextResponse.json({ clientId: client.id });
}
