/**
 * Cliente Supabase (Auth) no backend – validação de access token.
 */
const { createClient } = require('@supabase/supabase-js');

let client = null;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function supabaseAuthConfigurado() {
  return Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
}

/**
 * Valida o access_token do Supabase Auth e retorna o usuário.
 */
async function verificarTokenSupabase(accessToken) {
  const sb = getSupabase();
  if (!sb) {
    const err = new Error('Supabase Auth não configurado');
    err.status = 503;
    throw err;
  }

  const { data, error } = await sb.auth.getUser(accessToken);
  if (error || !data?.user) {
    const err = new Error(error?.message || 'Token Supabase inválido');
    err.status = 401;
    throw err;
  }
  return data.user;
}

module.exports = {
  getSupabase,
  supabaseAuthConfigurado,
  verificarTokenSupabase,
};
