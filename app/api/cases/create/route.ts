import { createClient as createServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";


interface NewClientData {
  full_name: string;
  email?: string;
  phone?: string;
  nationality?: string;
}

export async function POST(request: Request) {
  // 1. Verify auth and get firm_id
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role client to bypass RLS on profiles — the session JWT may
  // not yet carry firm_id if the user just registered.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id, id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    console.error("[cases/create] profile has no firm_id for user:", user.id);
    return NextResponse.json(
      { error: "Profile not associated with a firm." },
      { status: 400 }
    );
  }

  const { firm_id: firmId, id: agentId } = profile;

  // 2. Parse body
  const body = await request.json();
  const {
    clientId,
    newClient,
    visaSubclass,
    visaStream,
    notes,
    sponsorId,
    templateId,
  }: {
    clientId?: string;
    newClient?: NewClientData;
    visaSubclass: string;
    visaStream?: string;
    notes?: string;
    sponsorId?: string;
    templateId?: string;
  } = body;

  if (!visaSubclass) {
    return NextResponse.json(
      { error: "Visa subclass is required." },
      { status: 400 }
    );
  }

  if (!clientId && !newClient?.full_name) {
    return NextResponse.json(
      { error: "A client is required." },
      { status: 400 }
    );
  }

  try {
    // 3. Create new client if needed
    let resolvedClientId = clientId;

    if (!resolvedClientId && newClient) {
      const { data: created, error: clientErr } = await supabaseAdmin
        .from("clients")
        .insert({
          firm_id: firmId,
          full_name: newClient.full_name,
          email: newClient.email ?? null,
          phone: newClient.phone ?? null,
          nationality: newClient.nationality ?? null,
        })
        .select("id")
        .single();

      if (clientErr || !created) {
        return NextResponse.json(
          { error: clientErr?.message ?? "Could not create client." },
          { status: 500 }
        );
      }
      resolvedClientId = created.id;
    }

    // 4. Generate ref_number: MA-YYYY-NNN
    const year = new Date().getFullYear();
    const prefix = `MA-${year}-`;

    const { data: lastCase } = await supabaseAdmin
      .from("cases")
      .select("ref_number")
      .eq("firm_id", firmId)
      .like("ref_number", `${prefix}%`)
      .order("ref_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNum = 1;
    if (lastCase?.ref_number) {
      const parts = lastCase.ref_number.split("-");
      const parsed = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }

    const refNumber = `${prefix}${String(nextNum).padStart(3, "0")}`;

    // 5. Create the case
    const { data: newCase, error: caseErr } = await supabaseAdmin
      .from("cases")
      .insert({
        firm_id: firmId,
        agent_id: agentId,
        client_id: resolvedClientId,
        sponsor_id: sponsorId ?? null,
        ref_number: refNumber,
        visa_subclass: visaSubclass,
        visa_stream: visaStream ?? null,
        notes: notes ?? null,
        status: "active",
        template_id: templateId ?? null,
      })
      .select("id")
      .single();

    if (caseErr || !newCase) {
      return NextResponse.json(
        { error: caseErr?.message ?? "Could not create case." },
        { status: 500 }
      );
    }

    const caseId = newCase.id;

    // 6. Resolve firm workflow template (clone global if not yet present)
    let workflowTemplateId: string | null = null;

    const { data: existingTemplate } = await supabaseAdmin
      .from("workflow_templates")
      .select("id")
      .eq("visa_subclass", visaSubclass)
      .eq("firm_id", firmId)
      .maybeSingle();

    if (existingTemplate) {
      workflowTemplateId = existingTemplate.id;
    } else {
      const { data: cloned, error: cloneErr } = await supabaseAdmin.rpc(
        "clone_workflow_for_firm",
        { p_visa_subclass: visaSubclass, p_firm_id: firmId }
      );

      if (!cloneErr && cloned) {
        workflowTemplateId = cloned as string;
      }
      // If clone fails (no global template), proceed without workflow
    }

    // 7. Seed stage + task progress if we have a workflow template
    if (workflowTemplateId) {
      const { data: stages } = await supabaseAdmin
        .from("workflow_stages")
        .select("id, stage_order")
        .eq("template_id", workflowTemplateId)
        .order("stage_order", { ascending: true });

      if (stages && stages.length > 0) {
        // Seed stage progress
        await supabaseAdmin.from("case_stage_progress").insert(
          stages.map((s) => ({
            case_id: caseId,
            stage_id: s.id,
            is_complete: false,
          }))
        );

        // Seed task progress — fetch all tasks for all stages in one query
        const { data: tasks } = await supabaseAdmin
          .from("workflow_tasks")
          .select("id")
          .in(
            "stage_id",
            stages.map((s) => s.id)
          );

        if (tasks && tasks.length > 0) {
          await supabaseAdmin.from("case_task_progress").insert(
            tasks.map((t) => ({
              case_id: caseId,
              task_id: t.id,
              is_complete: false,
            }))
          );
        }

        // Set current_stage_id to the first stage
        await supabaseAdmin
          .from("cases")
          .update({ current_stage_id: stages[0].id })
          .eq("id", caseId);
      }
    }

    // 8. Seed document checklist from document_types for this visa subclass
    const { data: docTypes } = await supabaseAdmin
      .from("document_types")
      .select("id, label")
      .eq("visa_subclass", visaSubclass);

    if (docTypes && docTypes.length > 0) {
      await supabaseAdmin.from("case_documents").insert(
        docTypes.map((dt) => ({
          case_id: caseId,
          document_type_id: dt.id,
          label: dt.label,
          status: "pending",
        }))
      );
    }

    return NextResponse.json({ caseId });
  } catch (err) {
    console.error("cases/create error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
