const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');

const {
    giveCoachFeedback,
    getCoachFeedbacks,
} = require('../../controllers/feedback/coachFeedbackController');

router.post('/coach/:coach_id/feedback', protect, giveCoachFeedback);
router.get('/coach/:coach_id/feedback', protect, getCoachFeedbacks);

module.exports = router;
