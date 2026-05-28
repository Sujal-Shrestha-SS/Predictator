const express = require('express');
const router = express.Router();
const { getAllStandings, getGroupStandingsRoute, recalculate } = require('../controllers/standingsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', getAllStandings);
router.get('/:group', getGroupStandingsRoute);
router.post('/recalculate', authenticate, requireAdmin, recalculate);

module.exports = router;