import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { setApiAuthToken } from "../api";

export interface AppUser {
  id: number;
  username: string;
  email: string;
  rol: number | null;
  rol_nombre?: string | null;
  permisos: string[];
}

interface UserState {
  user: AppUser | null;
  token: string | null;
  setSession: (user: AppUser, token: string) => void;
  clearSession: () => void;
}

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};

const storage = typeof window !== "undefined" ? window.localStorage : noopStorage;

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setSession: (user, token) => {
        set({ user, token });
        setApiAuthToken(token);
      },
      clearSession: () => {
        set({ user: null, token: null });
        setApiAuthToken(null);
      },
    }),
    {
      name: "electrostore-auth",
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setApiAuthToken(state.token);
        }
      },
    }
  )
);
