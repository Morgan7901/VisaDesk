import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated." }, { status: 400 });
  }

  const body = await request.json();
  const { case_id, comm_type, direction, subject, body: bodyText, is_omara_logged } = body;

  if (!case_id || !comm_type || !direction || !bodyText) {
    return NextResponse.json(
      { error: "case_id, comm_type, direction, and body are required." },
      { status: 400 }
    );
  }

  // Verify case belongs to firm
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id")
    .eq("id", case_id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const { data: comm, error } = await supabaseAdmin
    .from("communications")
    .insert({
      case_id,
      firm_id: profile.firm_id,
      author_id: user.id,
      comm_type,
      direction,
      subject: subject ?? null,
      body: bodyText,
      is_omara_logged: is_omara_logged ?? true,
    })
    .select("id, comm_type, direction, subject, body, is_omara_logged, created_at, author_id")
    .single();

  if (error || !comm) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create communication." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    communication: {
      ...comm,
      author_name: profile.full_name ?? null,
    },
  });
}
