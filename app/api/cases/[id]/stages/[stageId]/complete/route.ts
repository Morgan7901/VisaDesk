import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string; stageId: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all required task IDs for this stage
  const { data: requiredTasks, error: taskFetchErr } = await supabase
    .from("workflow_tasks")
    .select("id")
    .eq("stage_id", params.stageId)
    .eq("is_required", true);

  if (taskFetchErr) return NextResponse.json({ error: taskFetchErr.message }, { status: 500 });

  if (requiredTasks && requiredTasks.length > 0) {
    const requiredIds = requiredTasks.map((t) => t.id);

    const { data: incomplete, error: checkErr } = await supabase
      .from("case_task_progress")
      .select("id")
      .eq("case_id", params.id)
      .in("task_id", requiredIds)
      .eq("is_complete", false);

    if (checkErr) return NextResponse.json({ error: checkErr.message }, { status: 500 });

    if (incomplete && incomplete.length > 0) {
      return NextResponse.json(
        { error: "All required tasks must be completed before marking the stage complete." },
        { status: 422 }
      );
    }
  }

  // Mark stage complete
  const { data: updated, error: stageErr } = await supabase
    .from("case_stage_progress")
    .update({
      is_complete: true,
      completed_by: user.id,
      completed_at: new Date().toISOString(),
    })
    .eq("case_id", params.id)
    .eq("stage_id", params.stageId)
    .select("id");

  if (stageErr) return NextResponse.json({ error: stageErr.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "Stage not found." }, { status: 404 });

  // Advance current_stage_id to next incomplete stage
  const { data: allStages } = await supabase
    .from("case_stage_progress")
    .select("stage_id, is_complete, workflow_stages(stage_order)")
    .eq("case_id", params.id);

  const arr = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  type StageOrderShape = { stage_order: number };

  const sorted = (allStages ?? [])
    .map((s) => ({
      stage_id: s.stage_id,
      is_complete: s.stage_id === params.stageId ? true : s.is_complete,
      stage_order:
        arr(s.workflow_stages as StageOrderShape | StageOrderShape[] | null)
          ?.stage_order ?? 0,
    }))
    .sort((a, b) => a.stage_order - b.stage_order);

  const currentIdx = sorted.findIndex((s) => s.stage_id === params.stageId);
  const nextStage = sorted.slice(currentIdx + 1).find((s) => !s.is_complete);

  if (nextStage) {
    await supabase
      .from("cases")
      .update({ current_stage_id: nextStage.stage_id })
      .eq("id", params.id);
  }

  return NextResponse.json({ success: true });
}
