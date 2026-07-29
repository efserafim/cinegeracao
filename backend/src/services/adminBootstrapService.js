const bcrypt = require("bcryptjs");

function getConfiguredAdminCredentials() {
  const email = String(process.env.ADMIN_EMAIL || "admin@cinegeracao.local").trim().toLowerCase();
  const senha = String(process.env.ADMIN_PASSWORD || "Admin@123");
  return { email, senha };
}

async function ensureConfiguredAdminForLogin(prismaClient, email, senha, nome = "Administrador") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const configured = getConfiguredAdminCredentials();

  if (!normalizedEmail || normalizedEmail !== configured.email || String(senha || "") !== configured.senha) {
    return null;
  }

  const senhaHash = await bcrypt.hash(configured.senha, 12);
  return prismaClient.admin.upsert({
    where: { email: configured.email },
    update: {
      nome: String(nome).slice(0, 120),
      senhaHash,
      ativo: true,
      perfil: "ADMIN",
    },
    create: {
      email: configured.email,
      nome: String(nome).slice(0, 120),
      senhaHash,
      ativo: true,
      perfil: "ADMIN",
    },
  });
}

module.exports = {
  getConfiguredAdminCredentials,
  ensureConfiguredAdminForLogin,
};
