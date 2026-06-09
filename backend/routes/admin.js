const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getUsers, updateUserRole,
  getTeams, createTeam, updateTeam,
  triggerFixtureSync, triggerTeamSync,
  triggerPointsRecalculation, triggerStandingsRecalculation,
  saveRoundOf32, generateNextKnockoutRound, resetRoundOf32,
  getAdminFixtures, setFixtureResult,
} = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.get('/teams', getTeams);
router.post('/teams', createTeam);
router.put('/teams/:id', updateTeam);
router.post('/sync/fixtures', triggerFixtureSync);
router.post('/sync/teams', triggerTeamSync);
router.post('/recalculate-points', triggerPointsRecalculation);
router.post('/recalculate-standings', triggerStandingsRecalculation);
router.post('/generate-knockout/round-of-32', saveRoundOf32);
router.delete('/generate-knockout/round-of-32', resetRoundOf32);
router.post('/generate-knockout/auto', generateNextKnockoutRound);
router.get('/fixtures', getAdminFixtures);              
router.put('/fixtures/:id/result', setFixtureResult); 

module.exports = router;