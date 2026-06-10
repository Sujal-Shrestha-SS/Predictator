const express = require('express');
const router = express.Router();
const {
  createLeague,
  joinLeague,
  getMyLeagues,
  getLeague,
  removeMember,
  leaveLeague,
  deleteLeague,
  regenerateCode,
  getAllLeaguesAdmin,
  getLeagueAdmin,
} = require('../controllers/leagueController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All league routes require authentication
router.use(authenticate);

// App-admin-only routes (must come before /:id to avoid route conflict)
router.get('/admin/all', requireAdmin, getAllLeaguesAdmin);
router.get('/admin/:id', requireAdmin, getLeagueAdmin);

router.get('/', getMyLeagues);
router.post('/', createLeague);
router.post('/join', joinLeague);

router.get('/:id', getLeague);
router.delete('/:id', deleteLeague);
router.post('/:id/leave', leaveLeague);
router.post('/:id/regenerate-code', regenerateCode);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;
