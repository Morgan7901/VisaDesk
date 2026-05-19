import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AuthStoreInitializer } from "@/components/dashboard/AuthStoreInitializer";
import type { AuthProfile } from "@/lib/stores/authStore";

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

  const { data: profileRaw } = await supabaseAdmin
    .from("profiles")
    .select("id, firm_id, role, full_name, email, suspended")
    .eq("id", user.id)
    .single();

  // Suspended users are redirected — belt-and-suspenders alongside middleware
  if (profileRaw?.suspended) redirect("/suspended");

  const profile: AuthProfile = {
    id: profileRaw?.id ?? user.id,
    firm_id: profileRaw?.firm_id ?? null,
    role: profileRaw?.role ?? "agent",
    full_name: profileRaw?.full_name ?? null,
    email: profileRaw?.email ?? user.email ?? null,
    suspended: profileRaw?.suspended ?? false,
  };

  const userName  = profile.full_name ?? user.email ?? "";
  const userEmail = profile.email ?? user.email ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AuthStoreInitializer profile={profile} />
      <Sidebar userName={userName} userEmail={userEmail} role={profile.role} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader userName={userName} />

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
