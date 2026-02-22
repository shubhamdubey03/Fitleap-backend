const express = require('express');
const router = express.Router();
const { getAllCoaches, getAllUsers, approveCoach } = require('../controllers/adminController');

// router.get('/pending-coaches', getPendingCoaches); // REMOVED
router.get('/coaches', getAllCoaches);
router.get('/users', getAllUsers);
router.put('/approve-coach/:id', approveCoach);


module.exports = router;
