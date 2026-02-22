const express = require('express');
const router = express.Router();
const { getCountries, getStatesByCountry } = require('../controllers/location');
const { protect } = require('../middleware/authMiddleware');

router.get('/countries', protect, getCountries);
router.get('/states/:countryId', protect, getStatesByCountry);
module.exports = router;
