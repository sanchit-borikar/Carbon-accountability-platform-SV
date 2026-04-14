import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface User {
  token: string;
  role: "public" | "regulator" | "company";
  orgName: string;
  sector: string;
  userId: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (data: { orgName: string; email: string; role: string; sector?: string; password: string }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 800));
    const role = email.toLowerCase().includes("regulator") ? "regulator" as const : "company" as const;
    const mockUser: User = {
      token: "mock-jwt-" + Math.random().toString(36).slice(2),
      role,
      orgName: role === "regulator" ? "Endor Environmental Alliance" : "EcoFreight Ltd",
      sector: role === "regulator" ? "Regulation" : "Transport",
      userId: role === "regulator" ? 1 : 5,
      email,
    };
    setUser(mockUser);
    return true;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const register = useCallback(async (data: { orgName: string; email: string; role: string; sector?: string; password: string }): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 800));
    const role = data.role === "regulator" ? "regulator" as const : "company" as const;
    setUser({
      token: "mock-jwt-" + Math.random().toString(36).slice(2),
      role,
      orgName: data.orgName,
      sector: data.sector || "General",
      userId: Math.floor(Math.random() * 1000),
      email: data.email,
    });
    return true;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
