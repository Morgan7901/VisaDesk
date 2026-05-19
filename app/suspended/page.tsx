import type { Metadata } from "next";
import { ShieldOff } from "lucide-react";

export const metadata: Metadata = { title: "Account Suspended — VisaDesk" };

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <ShieldOff className="h-7 w-7 text-red-600" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-900">Account Suspended</h1>
        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
          Your account has been suspended by your firm administrator.
          You cannot access VisaDesk until your account is reactivated.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Please contact your firm administrator to resolve this.
        </p>

        <a
          href="/login"
          className="mt-8 inline-block border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to Login
        </a>
      </div>
    </div>
  );
}
