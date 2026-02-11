const express = require('express');
const router = express.Router();
const { saveTokenAndNotify, sendBroadcastNotification } = require('../controllers/notificationController');

router.post('/save-token', saveTokenAndNotify);
router.post('/broadcast', sendBroadcastNotification);

module.exports = router;
