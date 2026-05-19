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
  /** Live count of unread notifications — kept in sync by NotificationBell */
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
