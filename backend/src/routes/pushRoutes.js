const express = require("express");
const { authAdmin } = require("../middlewares/auth");
const pushController = require("../controllers/pushController");

const router = express.Router();

router.get("/vapid-public-key", authAdmin, pushController.vapidPublicKey);
router.post("/subscribe", authAdmin, pushController.subscribe);
router.post("/unsubscribe", authAdmin, pushController.unsubscribe);

module.exports = router;
