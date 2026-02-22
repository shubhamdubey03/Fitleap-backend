const express = require('express');
const router = express.Router();
const { getStates } = require('../../state/stateController');
const { protect } = require('../../middleware/authMiddleware');


router.get('/states', protect, getStates);

module.exports = router;