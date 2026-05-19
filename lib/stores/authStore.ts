import { create } from "zustand";

export interface AuthProfile {
  id: string;
  firm_id: string | null;
  role: string;
  full_name: string | null;
  email: string | null;
  suspended: boolean;
}

interface AuthState {
  profile: AuthProfile | null;
  setProfile: (profile: AuthProfile) => void;
  clearProfile: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
}));
