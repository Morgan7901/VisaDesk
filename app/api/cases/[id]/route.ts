import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ALLOWED_FIELDS = new Set([
  "lodgement_date",
  "trn",
  "grant_date",
  "visa_expiry",
  "notes",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionClient = await createClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch firm_id via admin client to bypass RLS
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  const body = await request.json();

  // Allow only safe fields
  const update: Record<string, string | null> = {};
  for (const [key, val] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      update[key] = (val as string) || null;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("cases")
    .update(update)
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  return NextResponse.json({ success: true });
}
