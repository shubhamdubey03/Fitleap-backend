const express = require('express');
const router = express.Router();
const workoutController = require('../../controllers/workout/workoutController');
const { protect } = require('../../middleware/authMiddleware');

// ✅ Create Workout (Admin)
router.post('/', protect, workoutController.createWorkout);

// ✅ Get All Workouts
router.get('/', protect, workoutController.getAllWorkouts);

// ✅ Get Single Workout by ID
router.get('/:id', protect, workoutController.getWorkoutById);

// ✅ Update Workout
router.put('/:workout_id', protect, workoutController.updateWorkoutTracker);

// ✅ Delete Workout
router.delete('/:id', protect, workoutController.deleteWorkout);

module.exports = router;