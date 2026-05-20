import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth check
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch firm_id from profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Verify case belongs to firm
  const { data: caseRow } = await supabaseAdmin
    .from("cases")
    .select("id")
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const body = await request.json() as {
    position_title?: string | null;
    anzsco_code?: string | null;
    salary?: number | null;
    work_location?: string | null;
    lmt_exempt?: boolean | null;
    lmt_exempt_reason?: string | null;
    skills_assessment_body?: string | null;
    skills_assessment_status?: string | null;
  };

  const { error } = await supabaseAdmin
    .from("cases")
    .update({
      position_title: body.position_title ?? null,
      anzsco_code: body.anzsco_code ?? null,
      salary: body.salary ?? null,
      work_location: body.work_location ?? null,
      lmt_exempt: body.lmt_exempt ?? false,
      lmt_exempt_reason: body.lmt_exempt_reason ?? null,
      skills_assessment_body: body.skills_assessment_body ?? null,
      skills_assessment_status: body.skills_assessment_status ?? null,
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
