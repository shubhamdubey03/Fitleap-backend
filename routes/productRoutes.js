const express = require('express');
const router = express.Router();
const {
    createProduct,
    getProducts,
    productDetails,
    deleteProduct
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// GET all products
router.get('/', protect, getProducts);

// GET single product by ID
router.get('/:productId', protect, productDetails);

// POST create product
router.post('/', upload.single('image'), protect, createProduct);

// DELETE product
router.delete('/:id', protect, deleteProduct);

module.exports = router;
