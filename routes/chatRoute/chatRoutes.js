const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const { createOrGetChat, getConversations } = require("../../controllers/chat/chatController");

router.post("/", protect, createOrGetChat);
router.get("/conversations", protect, getConversations);

module.exports = router;