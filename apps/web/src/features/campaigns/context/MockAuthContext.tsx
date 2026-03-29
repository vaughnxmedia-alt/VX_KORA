import React, { createContext, useContext, useState, useCallback } from "react";

export type MockRole = "admin" | "intern" | "vendor" | "client";

export interface MockUser {
  id: string;
  name: string;
  orgId: string;
  role: MockRole;
}

/** Mock users for role-gated UI. TODO: Replace with real auth (Supabase Auth + RLS). */
export const MOCK_USERS: MockUser[] = [
  { id: "user-justice", name: "Justice", orgId: "org-1", role: "admin" },
  { id: "user-jocelyn", name: "Jocelyn", orgId: "org-1", role: "admin" },
  { id: "user-intern", name: "Example Intern", orgId: "org-1", role: "intern" },
  { id: "user-vendor", name: "Example Vendor", orgId: "org-1", role: "vendor" },
];

interface MockAuthContextValue {
  currentUser: MockUser;
  setCurrentUser: (user: MockUser) => void;
  isAdmin: boolean;
  /** All mock users for assignee selectors and team assignment. */
  users: MockUser[];
}

const MockAuthContext = createContext<MockAuthContextValue | null>(null);

export function MockAuthProvider({
  children,
  defaultUser = MOCK_USERS[0],
}: {
  children: React.ReactNode;
  defaultUser?: MockUser;
}) {
  const [currentUser, setCurrentUserState] = useState<MockUser>(defaultUser);
  const setCurrentUser = useCallback((user: MockUser) => setCurrentUserState(user), []);
  const isAdmin = currentUser.role === "admin";
  const value: MockAuthContextValue = {
    currentUser,
    setCurrentUser,
    isAdmin,
    users: MOCK_USERS,
  };
  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth(): MockAuthContextValue {
  const ctx = useContext(MockAuthContext);
  if (!ctx) throw new Error("useMockAuth must be used within MockAuthProvider");
  return ctx;
}
