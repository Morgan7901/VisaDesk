import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pipeline — VisaDesk" };

export default function PipelinePage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
      <p className="text-lg font-medium text-slate-700">Pipeline</p>
      <p className="mt-1 text-sm">Coming soon.</p>
    </div>
  );
}
