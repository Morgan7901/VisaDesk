import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ClientsPage } from "@/components/dashboard/ClientsPage";
import type { ClientRow } from "@/components/dashboard/ClientsPage";

export const metadata: Metadata = { title: "Clients — VisaDesk" };

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function ClientsPageRoute() {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single();

  if (!profile?.firm_id) redirect("/login");

  const firmId: string = profile.firm_id;

  // Fetch all clients for this firm
  const { data: rawClients } = await supabaseAdmin
    .from("clients")
    .select("id, full_name, email, phone, nationality, passport_expiry, portal_active")
    .eq("firm_id", firmId)
    .order("full_name", { ascending: true });

  // Fetch case counts per client in one query
  const clientIds = (rawClients ?? []).map((c) => c.id);
  const caseCounts: Record<string, number> = {};

  if (clientIds.length > 0) {
    const { data: cases } = await supabaseAdmin
      .from("cases")
      .select("client_id")
      .in("client_id", clientIds)
      .eq("firm_id", firmId);

    (cases ?? []).forEach((c) => {
      if (c.client_id) {
        caseCounts[c.client_id] = (caseCounts[c.client_id] ?? 0) + 1;
      }
    });
  }

  const clients: ClientRow[] = (rawClients ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    nationality: c.nationality ?? null,
    passport_expiry: c.passport_expiry ?? null,
    portal_active: c.portal_active ?? false,
    case_count: caseCounts[c.id] ?? 0,
  }));

  return <ClientsPage clients={clients} />;
}
