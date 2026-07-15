/**
 * Contas admin mestres (acesso total) — mesmos e-mails do Supabase Auth.
 * LEITOR não entra nesta lista.
 */
const MASTER_ADMINS = [
  {
    email: "laviniadossantos22@gmail.com",
    nome: "Lavínia Bernardino",
  },
  {
    email: String(process.env.EDUARDO_ADMIN_EMAIL || "efserafimflu@gmail.com")
      .trim()
      .toLowerCase(),
    nome: "Eduardo Ferreira Serafim",
  },
].filter((m) => m.email && m.email.includes("@"));

const MASTER_EMAILS = new Set(MASTER_ADMINS.map((m) => m.email.toLowerCase()));

const DISPLAY_BY_EMAIL = Object.fromEntries(
  MASTER_ADMINS.map((m) => [m.email.toLowerCase(), m.nome])
);

function isMasterAdminEmail(email) {
  return MASTER_EMAILS.has(String(email || "").trim().toLowerCase());
}

function nomeMasterPreferido(email) {
  return DISPLAY_BY_EMAIL[String(email || "").trim().toLowerCase()] || null;
}

module.exports = {
  MASTER_ADMINS,
  MASTER_EMAILS,
  isMasterAdminEmail,
  nomeMasterPreferido,
};
