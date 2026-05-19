import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

  const { visa_subclass } = await request.json();
  if (!visa_subclass) {
    return NextResponse.json({ error: "visa_subclass is required." }, { status: 400 });
  }

  // Call the clone_workflow_for_firm RPC
  const { data: newTemplateId, error: rpcError } = await supabaseAdmin.rpc(
    "clone_workflow_for_firm",
    { p_visa_subclass: visa_subclass, p_firm_id: profile.firm_id }
  );

  if (rpcError || !newTemplateId) {
    return NextResponse.json(
      { error: rpcError?.message ?? "Clone failed." },
      { status: 500 }
    );
  }

  // Return the full new template with stages + tasks
  const { data: raw } = await supabaseAdmin
    .from("workflow_templates")
    .select(`
      id, visa_subclass, label,
      workflow_stages(
        id, stage_order, label,
        workflow_tasks(id, task_order, label, is_required, stage_id)
      )
    `)
    .eq("id", newTemplateId)
    .single();

  if (!raw) {
    return NextResponse.json({ error: "Could not fetch cloned template." }, { status: 500 });
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
