import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { supabase, supabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('cg_token'));
  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cg_admin') || 'null');
    } catch {
      return null;
    }
  });

  function persistSession(data) {
    localStorage.setItem('cg_token', data.token);
    localStorage.setItem('cg_admin', JSON.stringify(data.admin));
    setToken(data.token);
    setAdmin(data.admin);
  }

  // Atualiza nome/e-mail do admin a partir da API (ex.: Lavínia Bernardino)
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    api.get('/auth/me')
      .then(({ data }) => {
        if (cancelled || !data?.data) return;
        const next = {
          id: data.data.id,
          nome: data.data.nome,
          email: data.data.email,
        };
        localStorage.setItem('cg_admin', JSON.stringify(next));
        setAdmin(next);
      })
      .catch(() => {
        /* token inválido: interceptor trata 401 */
      });
    return () => { cancelled = true; };
  }, [token]);

  /**
   * Preferência: Supabase Auth. Fallback: senha local na API.
   */
  async function login(email, senha) {
    if (supabaseConfigured && supabase) {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        if (error.message?.toLowerCase().includes('invalid login')) {
          const { data } = await api.post('/auth/login', { email, senha });
          persistSession(data.data);
          return data.data;
        }
        const err = new Error(error.message);
        err.code = 'supabase/auth';
        throw err;
      }

      const accessToken = authData.session?.access_token;
      if (!accessToken) {
        throw new Error('Sessão Supabase sem access_token');
      }

      const { data } = await api.post('/auth/login', { accessToken });
      persistSession(data.data);
      return data.data;
    }

    const { data } = await api.post('/auth/login', { email, senha });
    persistSession(data.data);
    return data.data;
  }

  async function logout() {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    localStorage.removeItem('cg_token');
    localStorage.removeItem('cg_admin');
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
      supabaseConfigured,
    }),
    [token, admin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
