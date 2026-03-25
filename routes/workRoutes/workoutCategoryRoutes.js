const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/workout/workoutCategoryController');
const { protect } = require('../../middleware/authMiddleware');

// Create category
router.post('/create', protect, categoryController.createCategory);

// Get all categories
router.get('/', protect, categoryController.getCategories);

// Update category
router.put('/update/:id', protect, categoryController.updateCategory);

// Delete category
router.delete('/delete/:id', protect, categoryController.deleteCategory);

module.exports = router;