import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SettingsPage } from "@/components/dashboard/SettingsPage";
import type {
  FirmData,
  ProfileData,
  WorkflowTemplate,
  GlobalTemplate,
} from "@/components/dashboard/SettingsPage";

export const metadata: Metadata = { title: "Settings — VisaDesk" };

export default async function SettingsPageRoute() {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, firm_id, full_name, email, phone, mara_number, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) redirect("/login");

  const firmId: string = profile.firm_id;

  // Firm details
  const { data: firmRaw } = await supabaseAdmin
    .from("firms")
    .select("id, name, mara_number, abn, address, phone, email, logo_url, plan")
    .eq("id", firmId)
    .single();

  const firm: FirmData | null = firmRaw
    ? {
        id: firmRaw.id,
        name: firmRaw.name,
        mara_number: firmRaw.mara_number ?? null,
        abn: firmRaw.abn ?? null,
        address: firmRaw.address ?? null,
        phone: firmRaw.phone ?? null,
        email: firmRaw.email ?? null,
        logo_url: firmRaw.logo_url ?? null,
        plan: firmRaw.plan,
      }
    : null;

  const profileData: ProfileData = {
    id: profile.id,
    full_name: profile.full_name ?? null,
    email: profile.email ?? user.email ?? null,
    phone: profile.phone ?? null,
    mara_number: profile.mara_number ?? null,
    avatar_url: profile.avatar_url ?? null,
  };

  // Firm's workflow templates with full stage + task tree
  const { data: rawTemplates } = await supabaseAdmin
    .from("workflow_templates")
    .select(
      `id, visa_subclass, label,
       workflow_stages(
         id, stage_order, label,
         workflow_tasks(id, task_order, label, is_required, stage_id)
       )`
    )
    .eq("firm_id", firmId)
    .order("visa_subclass", { ascending: true });

  // Global (system) templates — to show "Set up" buttons for unconfigured subclasses
  const { data: globalRaw } = await supabaseAdmin
    .from("workflow_templates")
    .select("visa_subclass, label")
    .is("firm_id", null)
    .order("visa_subclass", { ascending: true });

  const arrOf = <T,>(v: T | T[] | null): T[] =>
    Array.isArray(v) ? v : v ? [v] : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildTemplate = (t: any): WorkflowTemplate => {
    const stages = arrOf(t.workflow_stages)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => ({
        id: s.id,
        label: s.label,
        stage_order: s.stage_order,
        tasks: arrOf(s.workflow_tasks)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .sort((a: any, b: any) => a.task_order - b.task_order)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((task: any) => ({
            id: task.id,
            label: task.label,
            is_required: task.is_required,
            task_order: task.task_order,
            stage_id: s.id,
          })),
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.stage_order - b.stage_order);

    return {
      id: t.id,
      visa_subclass: t.visa_subclass,
      label: t.label,
      stages,
      stage_count: stages.length,
      task_count: stages.reduce((sum, s) => sum + s.tasks.length, 0),
    };
  };

  const templates: WorkflowTemplate[] = (rawTemplates ?? []).map(buildTemplate);

  const firmSubclasses = new Set(templates.map((t) => t.visa_subclass));
  const globalTemplates: GlobalTemplate[] = (globalRaw ?? [])
    .filter((t) => !firmSubclasses.has(t.visa_subclass))
    .map((t) => ({ visa_subclass: t.visa_subclass, label: t.label }));

  return (
    <SettingsPage
      firm={firm}
      profile={profileData}
      templates={templates}
      globalTemplates={globalTemplates}
    />
  );
}
