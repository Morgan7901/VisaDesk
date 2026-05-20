import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aiGenerationLimit } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function GET() {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch profile to get firm_id
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Fetch firm plan
  const { data: firmRow } = await supabaseAdmin
    .from("firms")
    .select("plan")
    .eq("id", profile.firm_id)
    .single();

  const plan = (firmRow as { plan?: string } | null)?.plan ?? "starter";
  const limit = aiGenerationLimit(plan);

  // Count this calendar month's usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("firm_id", profile.firm_id)
    .gte("created_at", startOfMonth.toISOString());

  const used = count ?? 0;

  return NextResponse.json({
    used,
    limit,
    remaining: Math.max(0, limit - used),
    plan,
  });
}
