import { getPortalCase } from "@/lib/supabase/portal";
import { SponsorPortal } from "@/components/portal/SponsorPortal";
import { ShieldOff } from "lucide-react";

export default async function SponsorPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPortalCase(token, "sponsor");

  if (!data || data.type !== "sponsor") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <ShieldOff className="h-7 w-7 text-slate-400" />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-slate-900">
            Link not found
          </h1>
          <p className="text-sm text-slate-500">
            This portal link is invalid or has expired. Please contact your
            migration agent for a new link.
          </p>
        </div>
      </div>
    );
  }

  return <SponsorPortal data={data} />;
}
