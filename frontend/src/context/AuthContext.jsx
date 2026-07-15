import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { isMasterAdminEmail } from "../lib/masterAdmins";

const AuthContext = createContext(null);

function normalizeAdmin(raw) {
  if (!raw) return null;
  const email = String(raw.email || "").toLowerCase();
  const isMaster = Boolean(raw.isMaster) || isMasterAdminEmail(email);
  // Mestres nunca ficam como LEITOR no front — evita menu/botões sumindo
  let perfil = raw.perfil || "ADMIN";
  if (isMaster) perfil = "ADMIN";
  return {
    id: raw.id,
    nome: raw.nome,
    email: raw.email,
    perfil,
    aparelhoNome: raw.aparelhoNome || null,
    isMaster,
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("cg_token"));
  const [admin, setAdmin] = useState(() => {
    try {
      return normalizeAdmin(JSON.parse(localStorage.getItem("cg_admin") || "null"));
    } catch {
      return null;
    }
  });

  function persistSession(data) {
    const nextAdmin = normalizeAdmin(data.admin);
    localStorage.setItem("cg_token", data.token);
    localStorage.setItem("cg_admin", JSON.stringify(nextAdmin));
    setToken(data.token);
    setAdmin(nextAdmin);
  }

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    api
      .get("/auth/me")
      .then(({ data }) => {
        if (cancelled || !data?.data) return;
        const next = normalizeAdmin(data.data);
        localStorage.setItem("cg_admin", JSON.stringify(next));
        setAdmin(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function login(email, senha) {
    if (supabaseConfigured && supabase) {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
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
      /* ignore */
    }
    localStorage.removeItem("cg_token");
    localStorage.removeItem("cg_admin");
    setToken(null);
    setAdmin(null);
  }

  const email = admin?.email;
  const isMaster = Boolean(admin?.isMaster) || isMasterAdminEmail(email);
  const perfil = isMaster ? "ADMIN" : admin?.perfil || "ADMIN";
  const isLeitor = !isMaster && perfil === "LEITOR";
  const isAdminFull = isMaster || perfil === "ADMIN";

  const value = useMemo(
    () => ({
      token,
      admin,
      login,
      logout,
      isAuthenticated: Boolean(token),
      supabaseConfigured,
      perfil,
      isLeitor,
      isAdminFull,
      isMaster,
    }),
    [token, admin, perfil, isLeitor, isAdminFull, isMaster]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
