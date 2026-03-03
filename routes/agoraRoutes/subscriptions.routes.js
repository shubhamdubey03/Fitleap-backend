const router = require('express').Router();
const { protect } = require('../../middleware/authMiddleware');
const ctrl = require('../../controllers/agora/subscription');

router.post('/', protect, ctrl.subscribe);
router.post('/verify', protect, ctrl.verifyPayment);
router.get('/', protect, ctrl.mySubscriptions);
router.patch('/:id/cancel', protect, ctrl.cancel);
router.get('/:coachId/plans', ctrl.getCoachPlans);

// Platform Plans
router.get('/plans/all', ctrl.getPlans); // Public/Users can see all plans
router.post('/plans', protect, ctrl.createPlan);
router.put('/plans/:id', protect, ctrl.updatePlan);
router.delete('/plans/:id', protect, ctrl.deletePlan);

module.exports = router;