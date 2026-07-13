const webpush = require("web-push");
const prisma = require("../config/prisma");
const config = require("../config");

const KEY_PUBLIC = "vapid_public_key";
const KEY_PRIVATE = "vapid_private_key";

let cachedKeys = null;

async function ensureVapidKeys() {
  if (cachedKeys) return cachedKeys;

  if (config.vapid.publicKey && config.vapid.privateKey) {
    cachedKeys = {
      publicKey: config.vapid.publicKey,
      privateKey: config.vapid.privateKey,
    };
  } else {
    const pub = await prisma.configuracao.findUnique({ where: { chave: KEY_PUBLIC } });
    const priv = await prisma.configuracao.findUnique({ where: { chave: KEY_PRIVATE } });
    if (pub?.valor && priv?.valor) {
      cachedKeys = { publicKey: pub.valor, privateKey: priv.valor };
    } else {
      const generated = webpush.generateVAPIDKeys();
      await prisma.configuracao.upsert({
        where: { chave: KEY_PUBLIC },
        update: { valor: generated.publicKey },
        create: { chave: KEY_PUBLIC, valor: generated.publicKey },
      });
      await prisma.configuracao.upsert({
        where: { chave: KEY_PRIVATE },
        update: { valor: generated.privateKey },
        create: { chave: KEY_PRIVATE, valor: generated.privateKey },
      });
      cachedKeys = generated;
      console.log("[push] Chaves VAPID geradas e salvas em configuracoes");
    }
  }

  webpush.setVapidDetails(
    config.vapid.subject || "mailto:setorjuventude.bacaxa@gmail.com",
    cachedKeys.publicKey,
    cachedKeys.privateKey
  );
  return cachedKeys;
}

async function getPublicKey() {
  const keys = await ensureVapidKeys();
  return keys.publicKey;
}

async function saveSubscription(adminId, subscription, userAgent) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    const err = new Error("Subscription inválida");
    err.status = 400;
    throw err;
  }
  await ensureVapidKeys();
  return prisma.adminPushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      adminId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent || null,
    },
    create: {
      adminId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent || null,
    },
  });
}

async function removeSubscription(endpoint, adminId) {
  if (!endpoint) return { count: 0 };
  return prisma.adminPushSubscription.deleteMany({
    where: { endpoint, ...(adminId ? { adminId } : {}) },
  });
}

async function notifyAdmins({ title, body, url = "/admin" }) {
  try {
    await ensureVapidKeys();
    const subs = await prisma.adminPushSubscription.findMany();
    if (!subs.length) return { sent: 0 };

    const payload = JSON.stringify({ title, body, url });
    let sent = 0;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent += 1;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await prisma.adminPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            console.warn("[push] falha ao enviar:", err.statusCode || err.message);
          }
        }
      })
    );
    return { sent };
  } catch (err) {
    console.warn("[push] notifyAdmins:", err.message);
    return { sent: 0, error: err.message };
  }
}

module.exports = {
  getPublicKey,
  saveSubscription,
  removeSubscription,
  notifyAdmins,
};
