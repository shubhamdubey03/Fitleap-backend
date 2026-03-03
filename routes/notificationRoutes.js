const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveTokenAndNotify, sendBroadcastNotification, getUserNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');

router.post('/save-token', protect, saveTokenAndNotify);
router.post('/broadcast', protect, sendBroadcastNotification);
router.get('/', protect, getUserNotifications);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);


module.exports = router;
