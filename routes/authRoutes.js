const express = require('express');
const router = express.Router();
const { signup, login, googleLogin, signupUser } = require('../controllers/authController');
const { forgotPassword, resetPassword } = require('../controllers/forgetpassController');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { protect } = require('../middleware/authMiddleware');

router.post('/signup-user', signupUser);
router.post('/signup', upload.fields([
    { name: 'nutrition', maxCount: 1 },
    { name: 'aadharCard', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
]), signup);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/google-simple', require('../controllers/authController').googleLoginSimple);
router.put('/update-profile', protect, upload.single('profileImage'), require('../controllers/authController').updateUserProfile);
router.get('/profile', protect, require('../controllers/authController').getUserProfile);
router.put('/update-profile-image', protect, upload.single('profileImage'), require('../controllers/authController').updateProfileImage);
module.exports = router;
