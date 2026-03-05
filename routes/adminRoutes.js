const express = require('express');
const router = express.Router();
const { getAllCoaches, getAllUsers, approveCoach, getStudentRequests, approveStudent } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

// router.get('/pending-coaches', getPendingCoaches); // REMOVED
router.get('/coaches', protect, getAllCoaches);
router.get('/users', protect, getAllUsers);
router.get('/student-requests', protect, getStudentRequests);
router.put('/approve-coach/:id', protect, approveCoach);
router.put('/approve-student/:id', protect, approveStudent);


module.exports = router;
