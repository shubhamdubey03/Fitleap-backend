const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

const {
    addFeedback,
    getProductFeedbacks,
    getUserFeedbacks
} = require('../controllers/feedbackController');

router.post('/feedback', protect, addFeedback);
router.get('/feedback/:productId', protect, getProductFeedbacks);
router.get('/user-feedback/:userId', protect, getUserFeedbacks);

module.exports = router;
