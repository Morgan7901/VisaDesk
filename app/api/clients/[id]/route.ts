import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";


const ALLOWED_FIELDS = [
  "full_name",
  "email",
  "phone",
  "date_of_birth",
  "nationality",
  "passport_number",
  "passport_expiry",
  "portal_active",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  // Verify client belongs to this firm
  const { data: existing } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const body = await request.json();

  // Only allow whitelisted fields
  const updates: Partial<Record<AllowedField, unknown>> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      updates[field] = body[field] === "" ? null : body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("clients")
    .update(updates)
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
