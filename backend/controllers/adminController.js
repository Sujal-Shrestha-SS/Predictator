const User = require('../models/User');
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');
const Prediction = require('../models/Prediction');
const { asyncHandler } = require('../middleware/errorHandler');
const { calculatePredictionScores, recalculateAllPoints } = require('../services/scoringService');
const { recalculateGroupStandings } = require('../services/standingsService');

// GET /api/admin/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const [userCount, fixtureCount, predictionCount, completedCount] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Fixture.countDocuments(),
    Prediction.countDocuments(),
    Fixture.countDocuments({ status: 'completed' }),
  ]);
  res.json({ stats: { users: userCount, fixtures: fixtureCount, predictions: predictionCount, completedMatches: completedCount } });
});

// GET /api/admin/users
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const filter = {};
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const [users, total] = await Promise.all([
    User.find(filter).select('-__v').sort({ totalPoints: -1 }).skip(skip).limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);
  res.json({ users, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});

// PUT /api/admin/users/:id/role
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// GET /api/admin/teams
const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find().sort({ name: 1 });
  res.json({ teams });
});

// POST /api/admin/teams
const createTeam = asyncHandler(async (req, res) => {
  const team = await Team.create(req.body);
  res.status(201).json({ team });
});

// PUT /api/admin/teams/:id
const updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json({ team });
});

// POST /api/admin/sync/fixtures
const triggerFixtureSync = asyncHandler(async (req, res) => {
  const count = await syncFixtures();
  res.json({ message: `Synced ${count} fixtures` });
});

// POST /api/admin/sync/teams
const triggerTeamSync = asyncHandler(async (req, res) => {
  const count = await syncTeams();
  res.json({ message: `Synced ${count} teams` });
});

// POST /api/admin/recalculate-points
const triggerPointsRecalculation = asyncHandler(async (req, res) => {
  await recalculateAllPoints();
  res.json({ message: 'Points recalculated for all users' });
});

// POST /api/admin/recalculate-standings
const triggerStandingsRecalculation = asyncHandler(async (req, res) => {
  await recalculateGroupStandings();
  res.json({ message: 'Group standings recalculated' });
});

// POST /api/admin/generate-knockout
const generateKnockout = asyncHandler(async (req, res) => {
  const GroupStanding = require('../models/GroupStanding');

  // Get top 2 from each group (and best 3rd-placed teams for WC 2026 format)
  const allGroups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const qualifiedTeams = [];

  for (const group of allGroups) {
    const standings = await GroupStanding.find({ group })
      .populate('team')
      .sort({ points: -1, goalDifference: -1, goalsFor: -1 })
      .limit(2);
    
    qualifiedTeams.push(...standings.map((s) => ({ team: s.team, group, position: s.position })));
  }

  // Pair teams for Round of 32 (simplified - real pairing follows FIFA rules)
  const fixtures = [];
  for (let i = 0; i < qualifiedTeams.length; i += 2) {
    if (qualifiedTeams[i + 1]) {
      fixtures.push({
        homeTeam: qualifiedTeams[i].team._id,
        awayTeam: qualifiedTeams[i + 1].team._id,
        stage: 'round_of_32',
        stadium: 'TBD',
        city: 'TBD',
        matchDatetime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'upcoming',
      });
    }
  }

  const created = await Fixture.insertMany(
    fixtures.map((f) => ({
      ...f,
      predictionDeadline: new Date(f.matchDatetime.getTime() - 60 * 60 * 1000),
    }))
  );

  res.json({ message: `Generated ${created.length} Round of 32 fixtures`, fixtures: created });
});


// GET /api/admin/fixtures
const getAdminFixtures = asyncHandler(async (req, res) => {
  const { status, stage, group } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (stage) filter.stage = stage;
  if (group) filter.group = group;
  const fixtures = await Fixture.find(filter)
    .populate('homeTeam', 'name shortName code flagUrl')
    .populate('awayTeam', 'name shortName code flagUrl')
    .sort({ matchDatetime: 1 });
  res.json({ fixtures });
});

// PUT /api/admin/fixtures/:id/result

const setFixtureResult = asyncHandler(async (req, res) => {
  const { homeScore, awayScore } = req.body;

  if (homeScore == null || awayScore == null) {
    return res.status(400).json({ error: 'homeScore and awayScore are required' });
  }

  const fixture = await Fixture.findById(req.params.id);
  if (!fixture) return res.status(404).json({ error: 'Fixture not found' });

  if (fixture.scoresCalculated) {
    await Prediction.updateMany({ fixture: fixture._id }, { isCalculated: false });
    fixture.scoresCalculated = false;
  }

  const home = parseInt(homeScore);
  const away = parseInt(awayScore);

  fixture.result = {
    homeScore: home,
    awayScore: away,
    winner: home > away ? 'home' : away > home ? 'away' : 'draw',
  };
  fixture.status = 'completed';
  await fixture.save();

  await calculatePredictionScores(fixture._id);

  // Wrap standings in try/catch so a standings error doesn't fail the whole request
  try {
    await recalculateGroupStandings();
  } catch (err) {
    console.error('Standings recalculation failed:', err.message);
  }

  await fixture.populate([
    { path: 'homeTeam', select: 'name shortName code flagUrl' },
    { path: 'awayTeam', select: 'name shortName code flagUrl' },
  ]);

  res.json({ fixture, message: 'Result saved and points calculated' });
});

module.exports = {
  getDashboardStats,
  getUsers,
  updateUserRole,
  getTeams,
  createTeam,
  updateTeam,
  triggerFixtureSync,
  triggerTeamSync,
  triggerPointsRecalculation,
  triggerStandingsRecalculation,
  generateKnockout,
  getAdminFixtures,
  setFixtureResult,
};