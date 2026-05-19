import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";


export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionClient = await createClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const arr = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  // Stage progress with stage details
  const { data: stageRows, error: stageErr } = await supabaseAdmin
    .from("case_stage_progress")
    .select("id, is_complete, completed_at, stage_id, workflow_stages(label, stage_order, icon)")
    .eq("case_id", params.id);

  if (stageErr) return NextResponse.json({ error: stageErr.message }, { status: 500 });

  // Task progress with task details
  const { data: taskRows, error: taskErr } = await supabaseAdmin
    .from("case_task_progress")
    .select(
      "id, is_complete, completed_at, task_id, workflow_tasks(label, task_order, is_required, trigger_type, requires_portal, stage_id)"
    )
    .eq("case_id", params.id);

  if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 });

  type StageShape = { label: string; stage_order: number; icon: string | null };
  type TaskShape = {
    label: string;
    task_order: number;
    is_required: boolean;
    trigger_type: string | null;
    requires_portal: string | null;
    stage_id: string;
  };

  const stageMap = new Map<
    string,
    {
      progress_id: string;
      stage_id: string;
      label: string;
      stage_order: number;
      icon: string | null;
      is_complete: boolean;
      completed_at: string | null;
      tasks: {
        progress_id: string;
        task_id: string;
        label: string;
        task_order: number;
        is_required: boolean;
        trigger_type: string | null;
        requires_portal: string | null;
        is_complete: boolean;
        completed_at: string | null;
      }[];
    }
  >();

  for (const row of stageRows ?? []) {
    const stage = arr(
      row.workflow_stages as StageShape | StageShape[] | null
    );
    if (!stage) continue;
    stageMap.set(row.stage_id, {
      progress_id: row.id,
      stage_id: row.stage_id,
      label: stage.label,
      stage_order: stage.stage_order,
      icon: stage.icon ?? null,
      is_complete: row.is_complete,
      completed_at: row.completed_at ?? null,
      tasks: [],
    });
  }

  for (const row of taskRows ?? []) {
    const task = arr(
      row.workflow_tasks as TaskShape | TaskShape[] | null
    );
    if (!task) continue;
    const stage = stageMap.get(task.stage_id);
    if (!stage) continue;
    stage.tasks.push({
      progress_id: row.id,
      task_id: row.task_id,
      label: task.label,
      task_order: task.task_order,
      is_required: task.is_required,
      trigger_type: task.trigger_type ?? null,
      requires_portal: task.requires_portal ?? null,
      is_complete: row.is_complete,
      completed_at: row.completed_at ?? null,
    });
  }

  const stages = Array.from(stageMap.values())
    .sort((a, b) => a.stage_order - b.stage_order)
    .map((s) => ({
      ...s,
      tasks: s.tasks.sort((a, b) => a.task_order - b.task_order),
    }));

  return NextResponse.json({ stages });
}
