const express = require('express');
const router = express.Router();
const { createVendor, getVendors } = require('../../vendor/vendorController');
const { protect } = require('../../middleware/authMiddleware');

router.post('/create-vendor', protect, createVendor);
router.get('/vendors', protect, getVendors);

module.exports = router;
