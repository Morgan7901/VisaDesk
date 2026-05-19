import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";


export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  const sessionClient = await createClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: updated, error } = await supabaseAdmin
    .from("case_task_progress")
    .update({
      is_complete: false,
      completed_by: null,
      completed_at: null,
    })
    .eq("case_id", params.id)
    .eq("task_id", params.taskId)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  return NextResponse.json({ success: true });
}
