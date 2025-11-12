import React, { createContext, useContext, useEffect, useState } from "react";

type Role = "admin" | "user" | null;
type AuthState = { token: string | null; role: Role };

type AuthContextValue = {
  auth: AuthState;
  setAuth: (v: AuthState) => void;
  logout: () => void;
};

const AuthCtx = createContext<AuthContextValue>({
  auth: { token: null, role: null },
  setAuth: () => {},
  logout: () => {},
});

function getRoleFromToken(token?: string | null): Role {
  if (!token) return null;
  try {
    const payload = JSON.parse(
      atob((token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/"))
    );
    const raw = payload.role ?? payload.rol ?? payload.perfil;
    const r = typeof raw === "string" ? raw.toLowerCase() : "";
    return r === "admin" || r === "user" ? (r as Role) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem("dc_token");
    const storedRole = (localStorage.getItem("dc_role") as Role) || null;
    const role = storedRole ?? getRoleFromToken(token);
    return { token, role };
  });

  useEffect(() => {
    if (auth.token) localStorage.setItem("dc_token", auth.token);
    else localStorage.removeItem("dc_token");
    if (auth.role) localStorage.setItem("dc_role", auth.role);
    else localStorage.removeItem("dc_role");
  }, [auth]);

  const logout = () => {
    localStorage.removeItem("dc_token");
    localStorage.removeItem("dc_role");
    setAuth({ token: null, role: null });
  };

  return (
    <AuthCtx.Provider value={{ auth, setAuth, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
