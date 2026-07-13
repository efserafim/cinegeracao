const pushService = require("../services/pushService");
const { success } = require("../utils/response");

async function vapidPublicKey(req, res, next) {
  try {
    const publicKey = await pushService.getPublicKey();
    return success(res, { publicKey });
  } catch (err) {
    return next(err);
  }
}

async function subscribe(req, res, next) {
  try {
    const data = await pushService.saveSubscription(
      req.admin.id,
      req.body.subscription,
      req.headers["user-agent"]
    );
    return success(res, { id: data.id }, "Notificações ativadas");
  } catch (err) {
    return next(err);
  }
}

async function unsubscribe(req, res, next) {
  try {
    await pushService.removeSubscription(req.body.endpoint, req.admin.id);
    return success(res, null, "Notificações desativadas");
  } catch (err) {
    return next(err);
  }
}

module.exports = { vapidPublicKey, subscribe, unsubscribe };
