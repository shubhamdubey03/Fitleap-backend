const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');

const {
    giveProductReview,
    getProductReviews,
} = require('../../controllers/feedback/productFeedbackController');

router.post('/product/:product_id/review', protect, giveProductReview);
router.get('/product/:product_id/review', getProductReviews);

module.exports = router;
