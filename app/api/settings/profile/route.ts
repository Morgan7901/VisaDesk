import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const ALLOWED_FIELDS = ["full_name", "phone", "mara_number", "avatar_url"] as const;

export async function PATCH(request: Request) {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  console.log("[PATCH /api/settings/profile] body received:", JSON.stringify(body));
  console.log("[PATCH /api/settings/profile] updating user id:", user.id);

  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) updates[field] = body[field] ?? null;
  }

  console.log("[PATCH /api/settings/profile] computed updates:", JSON.stringify(updates));

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("id, full_name, email, phone, mara_number, avatar_url")
    .single();

  if (error || !profile) {
    console.error("[PATCH /api/settings/profile] Supabase error:", error);
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  }

  console.log("[PATCH /api/settings/profile] Supabase returned:", JSON.stringify(profile));
  return NextResponse.json({ profile });
}
