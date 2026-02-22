const express = require('express');
const { createPaymentOrder, verifyPayment, updatePaymentStatus } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');


const router = express.Router();

router.post("/create", protect, createPaymentOrder);
router.post("/verify", protect, verifyPayment);
// router.put("/update-status", updatePaymentStatus);

module.exports = router;

