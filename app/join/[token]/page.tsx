import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { JoinForm } from "./JoinForm";

export const metadata: Metadata = { title: "Accept Invitation — VisaDesk" };

interface InvitationData {
  email: string;
  role: string;
  firm_name: string;
  error?: string;
}

async function getInvitation(token: string): Promise<InvitationData> {
  const { data: invitation } = await supabaseAdmin
    .from("team_invitations")
    .select("id, email, role, firm_id, accepted, expires_at, firms(name)")
    .eq("token", token)
    .single();

  if (!invitation) {
    return { email: "", role: "", firm_name: "", error: "Invitation not found or already used." };
  }

  if (invitation.accepted) {
    return { email: "", role: "", firm_name: "", error: "This invitation has already been accepted." };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { email: "", role: "", firm_name: "", error: "This invitation has expired. Ask your administrator to resend it." };
  }

  const arr = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const firm = arr(invitation.firms as { name: string } | { name: string }[] | null);

  return {
    email:     invitation.email,
    role:      invitation.role,
    firm_name: firm?.name ?? "your firm",
  };
}

export default async function JoinPage({
  params,
}: {
  params: { token: string };
}) {
  const data = await getInvitation(params.token);

  if (data.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-2 text-3xl">✉️</div>
          <h1 className="text-lg font-bold text-slate-900">Invitation Invalid</h1>
          <p className="mt-2 text-sm text-slate-500">{data.error}</p>
          <a
            href="/login"
            className="mt-6 inline-block border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <JoinForm
      token={params.token}
      email={data.email}
      role={data.role}
      firmName={data.firm_name}
    />
  );
}
