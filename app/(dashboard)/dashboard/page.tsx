import { createClient } from "@/lib/supabase/server";
import { addDays, startOfMonth, format } from "date-fns";
import { StatCards } from "@/components/dashboard/StatCards";
import { DeadlinePanel } from "@/components/dashboard/DeadlinePanel";
import { RecentCases } from "@/components/dashboard/RecentCases";
import type { DeadlineRow } from "@/components/dashboard/DeadlinePanel";
import type { RecentCaseRow } from "@/components/dashboard/RecentCases";

export const metadata = { title: "Dashboard — VisaDesk" };

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const plus7 = format(addDays(today, 7), "yyyy-MM-dd");
  const plus14 = format(addDays(today, 14), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");

  const [
    { count: activeCases },
    { count: weekDeadlines },
    { count: grantedThisMonth },
    { count: pendingDocuments },
    { data: rawDeadlines },
    { data: rawCases },
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),

    supabase
      .from("deadlines")
      .select("id", { count: "exact", head: true })
      .eq("is_complete", false)
      .gte("deadline_date", todayStr)
      .lte("deadline_date", plus7),

    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("status", "granted")
      .gte("grant_date", monthStart),

    supabase
      .from("case_documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("deadlines")
      .select(
        "id, label, deadline_date, deadline_type, cases(ref_number, clients(full_name))"
      )
      .eq("is_complete", false)
      .gte("deadline_date", todayStr)
      .lte("deadline_date", plus14)
      .order("deadline_date", { ascending: true })
      .limit(20),

    supabase
      .from("cases")
      .select("id, ref_number, visa_subclass, status, updated_at, clients(full_name)")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="space-y-6">
      <StatCards
        activeCases={activeCases ?? 0}
        weekDeadlines={weekDeadlines ?? 0}
        grantedThisMonth={grantedThisMonth ?? 0}
        pendingDocuments={pendingDocuments ?? 0}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Deadline panel — wider */}
        <div className="xl:col-span-3">
          <DeadlinePanel
            initialDeadlines={(rawDeadlines ?? []) as unknown as DeadlineRow[]}
          />
        </div>

        {/* Recent cases — narrower on xl, but stacks below on smaller screens */}
        <div className="xl:col-span-2">
          <RecentCases cases={(rawCases ?? []) as unknown as RecentCaseRow[]} />
        </div>
      </div>
    </div>
  );
}
