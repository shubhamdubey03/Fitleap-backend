const router = require('express').Router();
const { protect } = require('../../middleware/authMiddleware');
const ctrl = require('../../controllers/agora/availability');

router.post('/coaches/me/availability', protect, ctrl.setAvailability);
router.put('/availability/:id', protect, ctrl.updateAvailability);
router.delete('/availability/:id', protect, ctrl.deleteAvailability);
router.get('/coaches/:coachId/availability', ctrl.getCoachAvailability);

module.exports = router;