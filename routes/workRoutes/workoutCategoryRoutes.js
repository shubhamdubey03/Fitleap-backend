const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/workout/workoutCategoryController');

// Create category
router.post('/create', categoryController.createCategory);

// Get all categories
router.get('/', categoryController.getCategories);

module.exports = router;