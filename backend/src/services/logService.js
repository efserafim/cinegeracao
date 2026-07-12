const prisma = require("../config/prisma");
async function registrarLog({ adminId, acao, entidade, entidadeId, detalhes, ip }) {
  try {
    await prisma.log.create({
      data: {
        adminId: adminId || null,
        acao,
        entidade: entidade || null,
        entidadeId: entidadeId || null,
        detalhes: typeof detalhes === "string" ? detalhes : JSON.stringify(detalhes || {}),
        ip: ip || null
      }
    });
  } catch (err) {
    console.error("[LOG] Falha ao registrar log:", err.message);
  }
}
module.exports = { registrarLog };
