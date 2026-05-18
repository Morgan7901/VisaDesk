"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, Loader2 } from "lucide-react";

const schema = z
  .object({
    full_name: z.string().min(2, "Full name is required"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
    mara_number: z.string().optional(),
    firm_name: z.string().min(2, "Firm name is required"),
    abn: z.string().optional(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    // 1. Create firm + auth user via server route
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
        mara_number: values.mara_number || null,
        firm_name: values.firm_name,
        abn: values.abn || null,
      }),
    });

    const body = await res.json();

    if (!res.ok || body.error) {
      setServerError(body.error ?? "Registration failed. Please try again.");
      return;
    }

    // 2. Sign in to establish session
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (signInError) {
      setServerError(signInError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div className="flex items-start gap-2.5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Firm details */}
      <div className="border-b border-slate-100 pb-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Your Firm
        </p>
        <div className="space-y-4">
          <Field label="Firm / practice name" error={errors.firm_name?.message} required>
            <input
              type="text"
              placeholder="Ashford Migration Services"
              autoComplete="organization"
              {...register("firm_name")}
              className={inputCls(!!errors.firm_name)}
            />
          </Field>
          <Field label="ABN" error={errors.abn?.message}>
            <input
              type="text"
              placeholder="12 345 678 901"
              {...register("abn")}
              className={inputCls(!!errors.abn)}
            />
          </Field>
        </div>
      </div>

      {/* Personal details */}
      <div className="space-y-4 pt-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Your Details
        </p>
        <Field label="Full name" error={errors.full_name?.message} required>
          <input
            type="text"
            placeholder="Jane Smith"
            autoComplete="name"
            {...register("full_name")}
            className={inputCls(!!errors.full_name)}
          />
        </Field>
        <Field label="MARA number" error={errors.mara_number?.message}>
          <input
            type="text"
            placeholder="1234567"
            {...register("mara_number")}
            className={inputCls(!!errors.mara_number)}
          />
        </Field>
        <Field label="Email address" error={errors.email?.message} required>
          <input
            type="email"
            placeholder="jane@firm.com.au"
            autoComplete="email"
            {...register("email")}
            className={inputCls(!!errors.email)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" error={errors.password?.message} required>
            <input
              type="password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              {...register("password")}
              className={inputCls(!!errors.password)}
            />
          </Field>
          <Field label="Confirm password" error={errors.confirm_password?.message} required>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("confirm_password")}
              className={inputCls(!!errors.confirm_password)}
            />
          </Field>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-slate-800 underline underline-offset-2 hover:text-slate-900"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

// ── Shared helpers ─────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return [
    "w-full border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400",
    "focus:outline-none focus:ring-1",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-slate-300 focus:border-slate-500 focus:ring-slate-500",
  ].join(" ");
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
