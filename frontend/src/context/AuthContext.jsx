import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { supabase, supabaseConfigured } from "../lib/supabase";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("cg_token"));
  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cg_admin") || "null");
    } catch {
      return null;
    }
  });
  function persistSession(data) {
    localStorage.setItem("cg_token", data.token);
    localStorage.setItem("cg_admin", JSON.stringify(data.admin));
    setToken(data.token);
    setAdmin(data.admin);
  }
  useEffect(() => {
    if (!token) return void 0;
    let cancelled = false;
    api.get("/auth/me").then(({ data }) => {
      if (cancelled || !data?.data) return;
      const next = {
        id: data.data.id,
        nome: data.data.nome,
        email: data.data.email
      };
      localStorage.setItem("cg_admin", JSON.stringify(next));
      setAdmin(next);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [token]);
  async function login(email, senha) {
    if (supabaseConfigured && supabase) {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
      });
      if (error) {
        if (error.message?.toLowerCase().includes("invalid login")) {
          const { data: data3 } = await api.post("/auth/login", { email, senha });
          persistSession(data3.data);
          return data3.data;
        }
        const err = new Error(error.message);
        err.code = "supabase/auth";
        throw err;
      }
      const accessToken = authData.session?.access_token;
      if (!accessToken) {
        throw new Error("Sessão Supabase sem access_token");
      }
      const { data: data2 } = await api.post("/auth/login", { accessToken });
      persistSession(data2.data);
      return data2.data;
    }
    const { data } = await api.post("/auth/login", { email, senha });
    persistSession(data.data);
    return data.data;
  }
  async function logout() {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch {
    }
    localStorage.removeItem("cg_token");
    localStorage.removeItem("cg_admin");
    setToken(null);
    setAdmin(null);
  }
  const value = useMemo(
    () => ({
      token,
      admin,
      login,
      logout,
      isAuthenticated: Boolean(token),
      supabaseConfigured
    }),
    [token, admin]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  return useContext(AuthContext);
}
