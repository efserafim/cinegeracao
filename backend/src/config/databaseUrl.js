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

module.exports = { databaseUrlWithPoolLimit, applyDatabasePoolLimitToEnv };
