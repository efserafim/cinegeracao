const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const config = require("../config");
const { verificarTokenSupabase, supabaseAuthConfigurado } = require("../config/supabase");
const { registrarLog } = require("./logService");
const {
  isMasterAdminEmail,
  nomeMasterPreferido,
} = require("../config/masterAdmins");

function adminPublico(admin) {
  return {
    id: admin.id,
    nome: admin.nome,
    email: admin.email,
    perfil: admin.perfil || "ADMIN",
    aparelhoNome: admin.aparelhoNome || null,
    ativo: admin.ativo,
    isMaster: isMasterAdminEmail(admin.email),
  };
}

function emitirAccess(admin) {
  return jwt.sign(
    {
      email: admin.email,
      nome: admin.nome,
      perfil: admin.perfil || "ADMIN",
      purpose: "access",
      provider: "local",
    },
    config.jwt.secret,
    { subject: admin.id, expiresIn: config.jwt.expiresIn }
  );
}

async function carregarAdminAuth(adminId) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      aparelhoNome: true,
      ativo: true,
    },
  });
  if (!admin) return null;
  return sincronizarMaster(admin);
}

/** Garante nome + perfil ADMIN para Lavínia / Eduardo. */
async function sincronizarMaster(adminUser) {
  if (!adminUser || !isMasterAdminEmail(adminUser.email)) return adminUser;
  const nome = nomeMasterPreferido(adminUser.email) || adminUser.nome;
  if (adminUser.perfil === "ADMIN" && adminUser.nome === nome) return adminUser;
  return prisma.admin.update({
    where: { id: adminUser.id },
    data: {
      perfil: "ADMIN",
      nome: String(nome).slice(0, 120),
      ativo: true,
    },
  });
}

async function loginComSenha(email, senha, ip) {
  let admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (!admin || !admin.ativo) {
    const err = new Error("Credenciais inválidas");
    err.status = 401;
    throw err;
  }
  const ok = await bcrypt.compare(senha, admin.senhaHash);
  if (!ok) {
    const err = new Error("Credenciais inválidas");
    err.status = 401;
    throw err;
  }
  admin = await sincronizarMaster(admin);
  const token = emitirAccess(admin);
  await registrarLog({
    adminId: admin.id,
    acao: "LOGIN",
    entidade: "Admin",
    entidadeId: admin.id,
    ip,
  });
  return {
    token,
    provider: "local",
    admin: adminPublico(admin),
  };
}

async function garantirAdminDoSupabase(user) {
  const email = (user.email || "").toLowerCase();
  if (!email) {
    const err = new Error("Usuário Supabase sem e-mail");
    err.status = 401;
    throw err;
  }

  const isMaster = isMasterAdminEmail(email);
  const nomePreferido =
    nomeMasterPreferido(email) ||
    user.user_metadata?.nome ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    email.split("@")[0];

  let adminUser = await prisma.admin.findUnique({ where: { email } });

  if (!adminUser) {
    // Novos logins via Supabase só entram se forem mestres pré-cadastrados
    // ou se já existirem no banco (ex.: conta LEITOR criada por script).
    if (!isMaster) {
      const err = new Error("Conta sem permissão de acesso administrativo");
      err.status = 403;
      throw err;
    }
    const senhaHash = await bcrypt.hash(`supabase_${user.id}_${Date.now()}`, 12);
    adminUser = await prisma.admin.create({
      data: {
        email,
        nome: String(nomePreferido).slice(0, 120),
        senhaHash,
        ativo: true,
        perfil: "ADMIN",
      },
    });
  } else if (isMaster) {
    adminUser = await sincronizarMaster(adminUser);
  } else {
    const precisaAtualizarNome =
      adminUser.nome === email.split("@")[0] || adminUser.nome === email;
    if (precisaAtualizarNome && adminUser.nome !== String(nomePreferido).slice(0, 120)) {
      adminUser = await prisma.admin.update({
        where: { id: adminUser.id },
        data: { nome: String(nomePreferido).slice(0, 120) },
      });
    }
  }

  if (!adminUser.ativo) {
    const err = new Error("Administrador desativado");
    err.status = 403;
    throw err;
  }
  return adminUser;
}

async function loginComSupabase(accessToken, ip) {
  const user = await verificarTokenSupabase(accessToken);
  const adminUser = await garantirAdminDoSupabase(user);
  await registrarLog({
    adminId: adminUser.id,
    acao: "LOGIN_SUPABASE",
    entidade: "Admin",
    entidadeId: adminUser.id,
    detalhes: { supabaseUserId: user.id, email: adminUser.email },
    ip,
  });
  const token = emitirAccess(adminUser);
  return {
    token,
    provider: "supabase",
    admin: {
      ...adminPublico(adminUser),
      supabaseUserId: user.id,
    },
  };
}

async function me(adminId) {
  let admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      aparelhoNome: true,
      ativo: true,
      criadoEm: true,
    },
  });
  if (!admin) return null;
  admin = await sincronizarMaster(admin);
  return {
    ...admin,
    isMaster: isMasterAdminEmail(admin.email),
  };
}

async function resolverAdminDoToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (payload.purpose && payload.purpose !== "access") {
      const err2 = new Error("Token incompleto");
      err2.status = 401;
      throw err2;
    }
    return {
      id: payload.sub,
      email: payload.email,
      nome: payload.nome,
      perfil: payload.perfil || "ADMIN",
    };
  } catch (jwtErr) {
    if (jwtErr.status === 401) throw jwtErr;
  }
  if (supabaseAuthConfigurado()) {
    try {
      const user = await verificarTokenSupabase(token);
      const adminUser = await garantirAdminDoSupabase(user);
      return {
        id: adminUser.id,
        email: adminUser.email,
        nome: adminUser.nome,
        perfil: adminUser.perfil || "ADMIN",
        supabaseUserId: user.id,
      };
    } catch (sbErr) {
      if (sbErr.status) throw sbErr;
    }
  }
  const err = new Error("Token inválido ou expirado");
  err.status = 401;
  throw err;
}

module.exports = {
  loginComSenha,
  loginComSupabase,
  me,
  resolverAdminDoToken,
  carregarAdminAuth,
  adminPublico,
  sincronizarMaster,
  supabaseAuthConfigurado,
};
