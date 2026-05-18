import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Register — VisaDesk",
};

export default function RegisterPage() {
  return (
    <AuthLayout
      heading="Register your firm"
      subheading="Set up your VisaDesk account in under a minute"
    >
      <RegisterForm />
    </AuthLayout>
  );
}
