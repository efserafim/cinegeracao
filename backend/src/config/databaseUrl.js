/** Limita conexões no Supabase pooler — evita EMAXCONNSESSION no Render. */
function databaseUrlWithPoolLimit(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return url;
  if (/connection_limit=/i.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  const extra = [];
  if (/pooler\.supabase\.com:6543/i.test(url) && !/pgbouncer=/i.test(url)) {
    extra.push("pgbouncer=true");
  }
  extra.push("connection_limit=1");
  return `${url}${sep}${extra.join("&")}`;
}

function applyDatabasePoolLimitToEnv() {
  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = databaseUrlWithPoolLimit(process.env.DATABASE_URL);
  }
}

/**
 * Migrate NÃO funciona na porta 6543 (transaction pooler) — trava ou falha.
 * Use DIRECT_URL (session 5432) ou derivamos automaticamente a partir da DATABASE_URL.
 */
function resolveMigrateDatabaseUrl() {
  const direct = String(process.env.DIRECT_URL || "").trim();
  if (direct) {
    return databaseUrlWithPoolLimit(direct);
  }

  const runtime = String(process.env.DATABASE_URL || "").trim();
  if (!runtime) return "";

  if (/pooler\.supabase\.com:6543/i.test(runtime)) {
    let session = runtime.replace(":6543", ":5432");
    session = session.replace(/([?&])pgbouncer=true&?/gi, "$1");
    session = session.replace(/\?&/, "?").replace(/[?&]$/, "");
    return databaseUrlWithPoolLimit(session);
  }

  return databaseUrlWithPoolLimit(runtime);
}

module.exports = {
  databaseUrlWithPoolLimit,
  applyDatabasePoolLimitToEnv,
  resolveMigrateDatabaseUrl,
};
