"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  agent:   "Agent",
  finance: "Finance",
  staff:   "Staff",
};

interface Props {
  token: string;
  email: string;
  role: string;
  firmName: string;
}

export function JoinForm({ token, email, role, firmName }: Props) {
  const router = useRouter();

  const [fullName, setFullName]     = useState("");
  const [maraNumber, setMaraNumber] = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setSaving(true);
    setError(null);

    // 1. Create the account server-side
    const res = await fetch(`/api/join/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name:   fullName.trim(),
        password,
        mara_number: maraNumber.trim() || null,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Account creation failed.");
      setSaving(false);
      return;
    }

    // 2. Sign in with the new credentials using the browser client
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Account created but sign-in failed. Please go to the login page.");
      setSaving(false);
      return;
    }

    router.push("/dashboard");
  };

  const inputCls =
    "w-full border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-7 text-center">
          <p className="text-2xl font-bold tracking-tight">
            Visa<span className="text-blue-500">Desk</span>
          </p>
          <h1 className="mt-4 text-lg font-semibold text-slate-800">
            Join {firmName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            You&apos;ve been invited as a{" "}
            <span className="font-medium text-slate-700">
              {ROLE_LABELS[role] ?? role}
            </span>
            . Create your account to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-slate-200 p-6">
          {error && (
            <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Email — read only */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input type="email" value={email} disabled className={inputCls} />
          </div>

          {/* Full name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Full Name *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className={inputCls}
              required
            />
          </div>

          {/* MARA number — agents only */}
          {role === "agent" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                MARA Number <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={maraNumber}
                onChange={(e) => setMaraNumber(e.target.value)}
                placeholder="1234567"
                className={inputCls}
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Password *</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={cn(inputCls, "pr-10")}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Confirm Password *</label>
            <input
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              className={inputCls}
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#0f172a] py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 mt-2"
          >
            {saving ? "Creating account…" : "Create Account & Join"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Already have an account?{" "}
          <a href="/login" className="text-slate-600 underline underline-offset-2 hover:text-slate-900">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
