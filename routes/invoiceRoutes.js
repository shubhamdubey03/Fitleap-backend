const express = require('express');
const router = express.Router();
const { pdfGenerator } = require('../utils/pdfGenerator');
const { protect } = require('../middleware/authMiddleware');


router.post('/generate', protect, pdfGenerator);

module.exports = router;