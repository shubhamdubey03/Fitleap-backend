const express = require("express");
const router = express.Router();
const habitLogController = require("../../controllers/habit/habitlogController");
const { protect } = require('../../middleware/authMiddleware');

router.post("/habits/complete", protect, habitLogController.completeHabit);

router.get("/habits/:habit_id/streak", protect, habitLogController.getHabitStreak);

module.exports = router;