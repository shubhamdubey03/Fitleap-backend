const express = require('express');
const router = express.Router();
const { getPendingCoaches, approveCoach, getApprovedCoaches, getAllUsers } = require('../controllers/adminController');

router.get('/pending-coaches', getPendingCoaches);
router.get('/coaches', getApprovedCoaches);
router.get('/users', getAllUsers);
// Revert to original
router.put('/approve-coach/:id', approveCoach);

module.exports = router;
