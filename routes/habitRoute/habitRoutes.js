const express = require('express');
const router = express.Router();
const habitController = require('../../controllers/habit/habitController');
const { protect } = require('../../middleware/authMiddleware');


router.post('/habits', protect, habitController.createHabit);

router.get('/habits', protect, habitController.getHabits);

router.get('/habits/:id', protect, habitController.getSingleHabit);

router.put('/habits/:id', protect, habitController.updateHabit);

router.delete('/habits/:id', protect, habitController.deleteHabit);

router.patch('/habits/:id/status', protect, habitController.updateHabitStatus);

module.exports = router;