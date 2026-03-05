const express = require('express');
const router = express.Router();
const dietController = require('../../controllers/userDiet/userDietController');
const { protect } = require('../../middleware/authMiddleware');

router.post('/add', protect, dietController.addDiet);
router.get('/diet/:user_id', protect, dietController.getUserDiet);

module.exports = router;