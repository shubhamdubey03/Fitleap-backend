const router = require('express').Router();
const { protect } = require('../../middleware/authMiddleware');
const ctrl = require('../../controllers/agora/subscription');

router.post('/', protect, ctrl.subscribe);
router.get('/', protect, ctrl.mySubscriptions);
router.patch('/:id/cancel', protect, ctrl.cancel);

module.exports = router;