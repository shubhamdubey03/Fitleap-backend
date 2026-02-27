const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
    sendMessage,
    getMessages,
    markAsRead
} = require("../../controllers/chat/messageController");

router.post("/", protect, sendMessage);
router.get("/:chatId/messages", protect, getMessages);
router.patch("/read", protect, markAsRead);

module.exports = router;