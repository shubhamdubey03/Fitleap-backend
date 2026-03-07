const express = require("express");
const router = express.Router();
const reminderController = require("../../controllers/habit/reminderController");
const { protect } = require('../../middleware/authMiddleware');

router.post("/reminders", protect, reminderController.addReminder);
router.get("/reminders/:habit_id", protect, reminderController.getReminders);
// router.delete("/reminders/:habit_id", protect, reminderController.deleteReminders);

module.exports = router;    