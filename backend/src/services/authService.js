/**
 * Autenticação admin: Supabase Auth (preferencial) + senha local (fallback).
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const config = require('../config');
const { verificarTokenSupabase, supabaseAuthConfigurado } = require('../config/supabase');
const { registrarLog } = require('./logService');

/** Nomes de exibição fixos para admins (quando o cadastro veio só do e-mail). */
const ADMIN_DISPLAY_NAMES = {
  'laviniadossantos22@gmail.com': 'Lavínia Bernardino',
};

function emitirAccess(admin) {
  return jwt.sign(
    { email: admin.email, nome: admin.nome, purpose: 'access', provider: 'local' },
    config.jwt.secret,
    { subject: admin.id, expiresIn: config.jwt.expiresIn },
  );
}

async function loginComSenha(email, senha, ip) {
  const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (!admin || !admin.ativo) {
    const err = new Error('Credenciais inválidas');
    err.status = 401;
    throw err;
  }

  const ok = await bcrypt.compare(senha, admin.senhaHash);
  if (!ok) {
    const err = new Error('Credenciais inválidas');
    err.status = 401;
    throw err;
  }

  const token = emitirAccess(admin);
  await registrarLog({
    adminId: admin.id,
    acao: 'LOGIN',
    entidade: 'Admin',
    entidadeId: admin.id,
    ip,
  });

  return {
    token,
    provider: 'local',
    admin: { id: admin.id, nome: admin.nome, email: admin.email },
  };
}

async function garantirAdminDoSupabase(user) {
  const email = (user.email || '').toLowerCase();
  if (!email) {
    const err = new Error('Usuário Supabase sem e-mail');
    err.status = 401;
    throw err;
  }

  let adminUser = await prisma.admin.findUnique({ where: { email } });
  const nomePreferido =
    ADMIN_DISPLAY_NAMES[email]
    || user.user_metadata?.nome
    || user.user_metadata?.full_name
    || user.user_metadata?.name
    || email.split('@')[0];

  if (!adminUser) {
    const senhaHash = await bcrypt.hash(`supabase_${user.id}_${Date.now()}`, 12);
    adminUser = await prisma.admin.create({
      data: {
        email,
        nome: String(nomePreferido).slice(0, 120),
        senhaHash,
        ativo: true,
      },
    });
  } else {
    const precisaAtualizarNome =
      ADMIN_DISPLAY_NAMES[email]
      || adminUser.nome === email.split('@')[0]
      || adminUser.nome === email;

    if (precisaAtualizarNome && adminUser.nome !== String(nomePreferido).slice(0, 120)) {
      adminUser = await prisma.admin.update({
        where: { id: adminUser.id },
        data: { nome: String(nomePreferido).slice(0, 120) },
      });
    }
  }

  if (!adminUser.ativo) {
    const err = new Error('Administrador desativado');
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
    acao: 'LOGIN_SUPABASE',
    entidade: 'Admin',
    entidadeId: adminUser.id,
    detalhes: { supabaseUserId: user.id, email: adminUser.email },
    ip,
  });

  const token = emitirAccess(adminUser);
  return {
    token,
    provider: 'supabase',
    admin: {
      id: adminUser.id,
      nome: adminUser.nome,
      email: adminUser.email,
      supabaseUserId: user.id,
    },
  };
}

async function me(adminId) {
  return prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      nome: true,
      email: true,
      ativo: true,
      criadoEm: true,
    },
  });
}

async function resolverAdminDoToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (payload.purpose && payload.purpose !== 'access') {
      const err = new Error('Token incompleto');
      err.status = 401;
      throw err;
    }
    return {
      id: payload.sub,
      email: payload.email,
      nome: payload.nome,
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
        supabaseUserId: user.id,
      };
    } catch (sbErr) {
      if (sbErr.status) throw sbErr;
    }
  }

  const err = new Error('Token inválido ou expirado');
  err.status = 401;
  throw err;
}

module.exports = {
  loginComSenha,
  loginComSupabase,
  me,
  resolverAdminDoToken,
  supabaseAuthConfigurado,
};
