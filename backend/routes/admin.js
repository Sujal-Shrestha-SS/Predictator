const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getUsers, updateUserRole,
  getTeams, createTeam, updateTeam,
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
router.get('/fixtures', getAdminFixtures);              
router.put('/fixtures/:id/result', setFixtureResult); 

module.exports = router;