const express = require("express");
const router = express.Router();

const {
    createPC,
    getProgramsChallenges,
    subscribePC,
    enrollPC,
    completePC,
    createSubscriptionOrder,
    verifySubscriptionPayment
} = require("../../controllers/programs/pcController");
const { protect } = require("../../middleware/authMiddleware");

router.post("/create", protect, createPC);          // admin
router.get("/", protect, getProgramsChallenges);    // user
router.post("/subscribe", protect, subscribePC);    // user - legacy/direct (optional)
router.post("/subscribe/create-order", protect, createSubscriptionOrder); // user
router.post("/subscribe/verify", protect, verifySubscriptionPayment);     // user
router.post("/enroll", protect, enrollPC);          // user
router.post("/complete", protect, completePC);      // user

module.exports = router;