const express = require('express');
const router = express.Router();
const { sendMessage, getConversation, getConversations } = require('../controllers/chatController');

router.post('/send', sendMessage);
router.get('/conversations/:userId', getConversations);
router.get('/:userId/:otherUserId', getConversation);

module.exports = router;
