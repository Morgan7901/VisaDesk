import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { addDays, startOfMonth, format } from "date-fns";
import { StatCards } from "@/components/dashboard/StatCards";
import { DeadlinePanel } from "@/components/dashboard/DeadlinePanel";
import { RecentCases } from "@/components/dashboard/RecentCases";
import type { DeadlineRow } from "@/components/dashboard/DeadlinePanel";
import type { RecentCaseRow } from "@/components/dashboard/RecentCases";

export const metadata = { title: "Dashboard — VisaDesk" };


export default async function DashboardPage() {
  // Auth via session client — admin client does not hold session context
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) redirect("/login");

  // Fetch firm_id via admin client to bypass RLS on profiles
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) {
    console.log("[dashboard] no firm_id for user:", user.id);
    redirect("/login");
  }

  const firmId: string = profile.firm_id;
  console.log("[dashboard] firm_id:", firmId);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const plus7 = format(addDays(today, 7), "yyyy-MM-dd");
  const plus14 = format(addDays(today, 14), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");

  // case_documents has no firm_id column; resolve via case IDs first
  const { data: firmCaseRows } = await supabaseAdmin
    .from("cases")
    .select("id")
    .eq("firm_id", firmId);
  const firmCaseIds = firmCaseRows?.map((r) => r.id) ?? [];

  const [
    { count: activeCases },
    { count: weekDeadlines },
    { count: grantedThisMonth },
    { count: pendingDocuments },
    { data: rawDeadlines },
    { data: rawCases },
  ] = await Promise.all([
    supabaseAdmin
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("firm_id", firmId)
      .eq("status", "active"),

    supabaseAdmin
      .from("deadlines")
      .select("id", { count: "exact", head: true })
      .eq("firm_id", firmId)
      .eq("is_complete", false)
      .gte("deadline_date", todayStr)
      .lte("deadline_date", plus7),

    supabaseAdmin
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("firm_id", firmId)
      .eq("status", "granted")
      .gte("grant_date", monthStart),

    firmCaseIds.length > 0
      ? supabaseAdmin
          .from("case_documents")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .in("case_id", firmCaseIds)
      : Promise.resolve({ count: 0, data: null, error: null }),

    supabaseAdmin
      .from("deadlines")
      .select(
        "id, label, deadline_date, deadline_type, cases(ref_number, clients(full_name))"
      )
      .eq("firm_id", firmId)
      .eq("is_complete", false)
      .gte("deadline_date", todayStr)
      .lte("deadline_date", plus14)
      .order("deadline_date", { ascending: true })
      .limit(20),

    supabaseAdmin
      .from("cases")
      .select("id, ref_number, visa_subclass, status, updated_at, clients(full_name)")
      .eq("firm_id", firmId)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  console.log("[dashboard] activeCases:", activeCases, "weekDeadlines:", weekDeadlines);

  return (
    <div className="space-y-6">
      <StatCards
        activeCases={activeCases ?? 0}
        weekDeadlines={weekDeadlines ?? 0}
        grantedThisMonth={grantedThisMonth ?? 0}
        pendingDocuments={pendingDocuments ?? 0}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <DeadlinePanel
            initialDeadlines={(rawDeadlines ?? []) as unknown as DeadlineRow[]}
          />
        </div>
        <div className="xl:col-span-2">
          <RecentCases cases={(rawCases ?? []) as unknown as RecentCaseRow[]} />
        </div>
      </div>
    </div>
  );
}
