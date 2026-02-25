const router = require('express').Router();
const ctrl = require('../../controllers/agora/availability');

router.get('/coaches/:coachId/slots', ctrl.getSlots);

module.exports = router;