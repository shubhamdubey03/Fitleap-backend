const router = require('express').Router();
const { protect } = require('../../middleware/authMiddleware');
const ctrl = require('../../controllers/agora/appointment');

router.post('/', protect, ctrl.book);
router.get('/', protect, ctrl.myAppointments);
router.get('/coaches/me/appointments', protect, ctrl.getCoachAppointments);
router.patch('/:id/accept', protect, ctrl.accept);
router.patch('/:id/reject', protect, ctrl.reject);
router.get('/:id', protect, ctrl.getOne);
router.patch('/:id/cancel', protect, ctrl.cancel);
router.post('/:id/refresh-token', protect, ctrl.refreshAgoraToken);
router.patch('/:appointmentId/complete', protect, ctrl.completeAppointment);

module.exports = router;