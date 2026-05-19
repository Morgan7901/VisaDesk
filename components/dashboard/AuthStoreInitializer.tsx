"use client";

import { useEffect } from "react";
import { useAuthStore, type AuthProfile } from "@/lib/stores/authStore";

/**
 * Invisible client component that seeds the Zustand auth store with
 * profile data fetched server-side by the dashboard layout.
 * Renders nothing — place it anywhere inside the layout tree.
 */
export function AuthStoreInitializer({ profile }: { profile: AuthProfile }) {
  const setProfile = useAuthStore((s) => s.setProfile);

  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);

  return null;
}
