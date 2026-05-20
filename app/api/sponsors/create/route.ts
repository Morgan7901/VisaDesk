import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";


export async function POST(request: Request) {
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

  const body = await request.json();
  const {
    company_name,
    abn,
    contact_name,
    contact_email,
    contact_phone,
  }: {
    company_name: string;
    abn?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  } = body;

  if (!company_name?.trim()) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("sponsors")
    .insert({
      firm_id: profile.firm_id,
      company_name: company_name.trim(),
      abn: abn?.trim() ?? null,
      contact_name: contact_name?.trim() ?? null,
      contact_email: contact_email?.trim() ?? null,
      contact_phone: contact_phone?.trim() ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create sponsor." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
