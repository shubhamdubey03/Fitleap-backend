const router = require('express').Router();
const { protect } = require('../../middleware/authMiddleware');
const ctrl = require('../../controllers/agora/appointment');

router.post('/', protect, ctrl.book);
router.get('/', protect, ctrl.myAppointments);
router.get('/requests', protect, ctrl.getRequests); // Coach view requests
router.post('/:id/accept', protect, ctrl.accept);   // Coach accept
router.post('/:id/reject', protect, ctrl.reject);   // Coach reject
router.get('/:id', protect, ctrl.getOne);
router.patch('/:id/cancel', protect, ctrl.cancel);
router.post('/:id/refresh-token', protect, ctrl.refreshAgoraToken);

module.exports = router;