import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — VisaDesk",
};

export default function LoginPage() {
  return (
    <AuthLayout
      heading="Welcome back"
      subheading="Sign in to your VisaDesk account"
    >
      <LoginForm />
    </AuthLayout>
  );
}
