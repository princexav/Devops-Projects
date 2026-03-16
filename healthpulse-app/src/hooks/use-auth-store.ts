import { create } from "zustand";
import type { User } from "@/types";
import { currentUser } from "@/lib/mock-data";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email: string, _password: string) => {
    // Mock login — accepts any password with the correct email
    if (email === "sarah.johnson@email.com") {
      set({ user: currentUser, isAuthenticated: true });
      return true;
    }
    // For demo: accept any non-empty credentials
    if (email && _password) {
      set({ user: currentUser, isAuthenticated: true });
      return true;
    }
    return false;
  },
  logout: () => {
    set({ user: null, isAuthenticated: false });
  },
}));
