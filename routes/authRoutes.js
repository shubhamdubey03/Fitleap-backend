const express = require('express');
const router = express.Router();
const { signup, login, googleLogin, signupUser } = require('../controllers/authController');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/signup-user', signupUser);
router.post('/signup', upload.fields([
    { name: 'nutrition', maxCount: 1 },
    { name: 'aadharCard', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
]), signup);
router.post('/login', login);
router.post('/google', googleLogin);

module.exports = router;
