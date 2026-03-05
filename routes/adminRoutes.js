const express = require('express');
const router = express.Router();
const { getAllCoaches, getAllUsers, approveCoach } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

// router.get('/pending-coaches', getPendingCoaches); // REMOVED
router.get('/coaches', protect, getAllCoaches);
router.get('/users', protect, getAllUsers);
router.put('/approve-coach/:id', protect, approveCoach);


module.exports = router;
