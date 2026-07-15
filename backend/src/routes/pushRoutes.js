const express = require("express");
const { authAdmin, requireAdmin } = require("../middlewares/auth");
const pushController = require("../controllers/pushController");

const router = express.Router();

router.get("/vapid-public-key", authAdmin, requireAdmin, pushController.vapidPublicKey);
router.post("/subscribe", authAdmin, requireAdmin, pushController.subscribe);
router.post("/unsubscribe", authAdmin, requireAdmin, pushController.unsubscribe);

module.exports = router;
