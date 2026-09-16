"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PageKey =
  | "dashboard"
  | "patients"
  | "patient-detail"
  | "appointments"
  | "leads"
  | "tasks"
  | "financial"
  | "services"
  | "staff"
  | "reports"
  | "settings"
  | "audit"
  | "notifications"
  | "profile";

type NavState = {
  page: PageKey;
  params: Record<string, string>;
  setPage: (page: PageKey, params?: Record<string, string>) => void;
  reset: () => void;
};

export const useNav = create<NavState>()(
  persist(
    (set) => ({
      page: "dashboard",
      params: {},
      setPage: (page, params = {}) => {
        set({ page, params });
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("p", page);
          for (const [k, v] of Object.entries(params)) {
            url.searchParams.set(k, v);
          }
          window.history.replaceState({}, "", url.toString());
        }
      },
      reset: () => set({ page: "dashboard", params: {} }),
    }),
    { name: "crm-nav" },
  ),
);

/** Initialize nav from URL on first mount (sync with ?p= query param). */
export function initNavFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const p = url.searchParams.get("p") as PageKey | null;
  if (p) {
    const params: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) {
      if (k !== "p") params[k] = v;
    }
    useNav.setState({ page: p, params });
  }
}

type AuthState = {
  user: {
    id: string;
    name: string;
    email: string;
    roles: string[];
    permissions: string[];
  } | null;
  setUser: (u: AuthState["user"]) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),
      logout: () => {
        set({ user: null });
        useNav.getState().reset();
      },
    }),
    { name: "crm-auth" },
  ),
);
