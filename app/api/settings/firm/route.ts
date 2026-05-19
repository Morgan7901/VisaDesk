import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const ALLOWED_FIELDS = ["name", "mara_number", "abn", "address", "phone", "email", "logo_url"] as const;

export async function PATCH(request: Request) {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
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
  console.log("[PATCH /api/settings/firm] body received:", JSON.stringify(body));
  console.log("[PATCH /api/settings/firm] updating firm_id:", profile.firm_id);

  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) updates[field] = body[field] ?? null;
  }

  console.log("[PATCH /api/settings/firm] computed updates:", JSON.stringify(updates));

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
  }

  const { data: firm, error } = await supabaseAdmin
    .from("firms")
    .update(updates)
    .eq("id", profile.firm_id)
    .select("id, name, mara_number, abn, address, phone, email, logo_url, plan")
    .single();

  if (error || !firm) {
    console.error("[PATCH /api/settings/firm] Supabase error:", error);
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  }

  console.log("[PATCH /api/settings/firm] Supabase returned:", JSON.stringify(firm));
  return NextResponse.json({ firm });
}
