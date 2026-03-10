const express = require("express");
const router = express.Router();

const planController = require("../../controllers/programs/subscriptionController");
const { protect } = require("../../middleware/authMiddleware");

router.post("/plan/create", protect, planController.createPlan);
router.get("/plan/list", protect, planController.getPlans);
router.put("/plan/update/:id", protect, planController.updatePlan);
router.delete("/plan/delete/:id", protect, planController.deletePlan);

module.exports = router;