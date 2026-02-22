const express = require('express');
const { createOrder, updateOrderStatus, createProduct, getProducts, productDetails, deleteProduct, saveAddress, getAddress, getAddresses, getUserOrders, deleteAddress, updateAddress } = require('../controllers/orderController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post("/create", protect, createOrder); // Order Routes
router.put("/status", protect, updateOrderStatus);

router.post("/products", protect, upload.single('image'), createProduct); // Product Routes
router.get("/products", protect, getProducts);
router.get("/products/:productId", protect, productDetails);
router.delete("/products/:id", protect, deleteProduct);

// Address Routes (Grouped here for simplicity related to checking out)
router.post("/address", protect, saveAddress);
router.get("/address", protect, getAddresses);
router.put("/address/:id", protect, updateAddress);
router.delete("/address/:id", protect, deleteAddress);


router.get("/user", protect, getUserOrders);

module.exports = router;
