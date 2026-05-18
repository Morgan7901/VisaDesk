import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: updated, error } = await supabase
    .from("case_task_progress")
    .update({
      is_complete: true,
      completed_by: user.id,
      completed_at: new Date().toISOString(),
    })
    .eq("case_id", params.id)
    .eq("task_id", params.taskId)
    .select("id, workflow_tasks(trigger_type, label)");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const arr = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  type TaskMeta = { trigger_type: string | null; label: string };
  const task = arr(updated[0].workflow_tasks as TaskMeta | TaskMeta[] | null);

  if (task?.trigger_type) {
    await supabase.from("automation_log").insert({
      case_id: params.id,
      trigger_type: task.trigger_type,
      trigger_description: `Task completed: ${task.label}`,
      fired_by: user.id,
    });
  }

  return NextResponse.json({ success: true });
}
