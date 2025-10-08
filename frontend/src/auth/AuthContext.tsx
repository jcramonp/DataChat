import { createContext, useContext, useEffect, useState } from "react";

type AuthState = { token: string | null; role: "user" | "admin" | null };
const AuthCtx = createContext<{
  auth: AuthState;
  setAuth: (v: AuthState) => void;
  logout: () => void;
}>({ auth: { token: null, role: null }, setAuth: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem("dc_token");
    const role = localStorage.getItem("dc_role") as AuthState["role"];
    return { token, role: role || null };
  });

  useEffect(() => {
    if (auth.token) localStorage.setItem("dc_token", auth.token);
    else localStorage.removeItem("dc_token");
    if (auth.role) localStorage.setItem("dc_role", auth.role);
    else localStorage.removeItem("dc_role");
  }, [auth]);

  const logout = () => setAuth({ token: null, role: null });

  return <AuthCtx.Provider value={{ auth, setAuth, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
