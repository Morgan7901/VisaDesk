import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionClient = await createClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const userName = profile?.full_name ?? user.email ?? "";
  const userEmail = profile?.email ?? user.email ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar userName={userName} userEmail={userEmail} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader userName={userName} />

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
