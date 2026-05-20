import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const visaSubclass = searchParams.get("visa_subclass");

  if (!visaSubclass) {
    return NextResponse.json({}, { status: 200 });
  }

  // Try firm-specific template first
  const { data: firmTemplate } = await supabaseAdmin
    .from("case_templates")
    .select("id")
    .eq("visa_subclass", visaSubclass)
    .eq("firm_id", profile.firm_id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (firmTemplate) {
    return NextResponse.json({ id: firmTemplate.id });
  }

  // Fall back to system default
  const { data: systemTemplate } = await supabaseAdmin
    .from("case_templates")
    .select("id")
    .eq("visa_subclass", visaSubclass)
    .eq("is_system_default", true)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (systemTemplate) {
    return NextResponse.json({ id: systemTemplate.id });
  }

  return NextResponse.json({});
}
