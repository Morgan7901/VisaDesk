import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

interface TaskUpdate {
  id: string | null;
  stage_id: string;
  label: string;
  is_required: boolean;
  task_order: number;
}

export async function PATCH(
  request: Request,
  { params }: { params: { templateId: string } }
) {
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

  // Verify template belongs to this firm
  const { data: template } = await supabaseAdmin
    .from("workflow_templates")
    .select("id")
    .eq("id", params.templateId)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const body = await request.json();
  const tasks: TaskUpdate[] = body.tasks ?? [];
  const deletedIds: string[] = body.deleted_ids ?? [];

  // 1. Delete removed tasks
  if (deletedIds.length > 0) {
    await supabaseAdmin
      .from("workflow_tasks")
      .delete()
      .in("id", deletedIds);
  }

  // 2. Separate new vs existing tasks
  const toUpdate = tasks.filter((t) => t.id !== null);
  const toInsert = tasks.filter((t) => t.id === null);

  // 3. Update existing tasks one-by-one (batch upsert loses type safety)
  for (const task of toUpdate) {
    await supabaseAdmin
      .from("workflow_tasks")
      .update({
        label: task.label,
        is_required: task.is_required,
        task_order: task.task_order,
      })
      .eq("id", task.id!);
  }

  // 4. Insert new tasks
  if (toInsert.length > 0) {
    await supabaseAdmin.from("workflow_tasks").insert(
      toInsert.map((t) => ({
        stage_id: t.stage_id,
        label: t.label,
        is_required: t.is_required,
        task_order: t.task_order,
      }))
    );
  }

  // Return updated template
  const { data: raw } = await supabaseAdmin
    .from("workflow_templates")
    .select(`
      id, visa_subclass, label,
      workflow_stages(
        id, stage_order, label,
        workflow_tasks(id, task_order, label, is_required, stage_id)
      )
    `)
    .eq("id", params.templateId)
    .single();

  if (!raw) {
    return NextResponse.json({ error: "Could not fetch updated template." }, { status: 500 });
  }

  const arrOf = <T,>(v: T | T[] | null): T[] =>
    Array.isArray(v) ? v : v ? [v] : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stages = arrOf(raw.workflow_stages as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any) => ({
      id: s.id,
      label: s.label,
      stage_order: s.stage_order,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tasks: arrOf(s.workflow_tasks as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => a.task_order - b.task_order)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => ({
          id: t.id,
          label: t.label,
          is_required: t.is_required,
          task_order: t.task_order,
          stage_id: s.id,
        })),
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.stage_order - b.stage_order);

  const taskCount = stages.reduce((sum, s) => sum + s.tasks.length, 0);

  return NextResponse.json({
    template: {
      id: raw.id,
      visa_subclass: raw.visa_subclass,
      label: raw.label,
      stages,
      stage_count: stages.length,
      task_count: taskCount,
    },
  });
}
