const User = require('../models/User');
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');
const Prediction = require('../models/Prediction');
const { asyncHandler } = require('../middleware/errorHandler');
const { calculatePredictionScores, recalculateAllPoints } = require('../services/scoringService');
const { recalculateGroupStandings } = require('../services/standingsService');

// GET /api/admin/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const STAGE_ORDER = ['group_stage', 'round_of_32', 'round_of_16', 'quarterfinal', 'semifinal'];

  const NEXT_STAGE_KEY = {
    group_stage:  'round_of_32',
    round_of_32:  'round_of_16',
    round_of_16:  'quarterfinal',
    quarterfinal: 'semifinal',
    semifinal:    'final',
  };

  const NEXT_STAGE_LABEL = {
    group_stage:  'Round of 32',
    round_of_32:  'Round of 16',
    round_of_16:  'Quarterfinal',
    quarterfinal: 'Semifinal',
    semifinal:    'Final + Third Place',
  };

  const [users, fixtures, predictions, completedMatches] = await Promise.all([
    User.countDocuments(),
    Fixture.countDocuments(),
    Prediction.countDocuments(),
    Fixture.countDocuments({ status: 'completed' }),
  ]);

  // Build a map of each stage's state
  const stageStats = {};
  for (const stage of [...STAGE_ORDER, 'final', 'third_place']) {
    const total      = await Fixture.countDocuments({ stage });
    const completed  = await Fixture.countDocuments({ stage, status: 'completed' });
    stageStats[stage] = { total, completed, pending: total - completed };
  }

  // Determine knockout button state
  // Always show a button — but it may be disabled with a reason
  let knockoutButton = {
    label:    'Set Up Round of 32',   // button text
    action:   'setup',                // 'setup' | 'auto' | 'complete' | null
    disabled: false,
    reason:   null,                   // shown when disabled
  };

  // Walk stages in order to find current position
  for (const stage of STAGE_ORDER) {
    const curr = stageStats[stage];
    const nextKey = NEXT_STAGE_KEY[stage];

    if (curr.total === 0) {
      // This stage doesn't exist yet — shouldn't happen for group_stage
      // but for knockout stages means we haven't generated it yet
      break;
    }

    if (curr.pending > 0) {
      // Current stage is still in progress — button exists but is disabled
      knockoutButton = {
        label:    stage === 'group_stage'
          ? 'Set Up Round of 32'
          : `Generate ${NEXT_STAGE_LABEL[stage]}`,
        action:   stage === 'group_stage' ? 'setup' : 'auto',
        disabled: true,
        reason:   `Complete all ${stage.replace(/_/g, ' ')} fixtures first (${curr.pending} remaining)`,
      };
      break;
    }

    // Current stage is fully complete — check if next stage exists
    const nextExists = nextKey ? stageStats[nextKey]?.total > 0 : false;

    if (!nextExists && nextKey) {
      // Next stage not generated yet — button is active
      knockoutButton = {
        label:    `Generate ${NEXT_STAGE_LABEL[stage]}`,
        action:   stage === 'group_stage' ? 'setup' : 'auto',
        disabled: false,
        reason:   null,
      };
      break;
    }

    // Next stage exists — continue loop to check further
    if (!nextKey) {
      // We've reached semifinals and it's complete — check final
      const finalDone = stageStats['final']?.completed > 0;
      knockoutButton = {
        label:    finalDone ? 'Tournament Complete 🏆' : 'Generate Final + Third Place',
        action:   finalDone ? 'complete' : 'auto',
        disabled: false,
        reason:   null,
      };
    }
  }

  res.json({
    stats: {
      users,
      fixtures,
      predictions,
      completedMatches,
      knockoutButton,
    },
  });
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

// POST /api/admin/generate-knockout/round-of-32
// Saves the 16 manually entered R32 fixtures
const saveRoundOf32 = asyncHandler(async (req, res) => {
  const Fixture = require('../models/Fixture');
  const { fixtures } = req.body; // array of 16 { homeTeamId, awayTeamId, matchNumber }

  if (!fixtures || fixtures.length !== 16) {
    return res.status(400).json({ error: 'Exactly 16 fixtures required' });
  }

  // Block if group stage not fully complete
  const incompleteGroup = await Fixture.countDocuments({
    stage: 'group_stage',
    status: { $ne: 'completed' },
  });
  if (incompleteGroup > 0) {
    return res.status(400).json({
      error: 'Complete all group stage fixtures before generating Round of 32',
    });
  }

  // Block if R32 already exists
  const existing = await Fixture.countDocuments({ stage: 'round_of_32' });
  if (existing > 0) {
    return res.status(400).json({ error: 'Round of 32 fixtures already exist' });
  }

  // Official R32 dates and venues (no stadium names per requirement)
  const FIXTURE_META = {
    73:  { date: '2026-06-28T17:00:00Z'   },
    74:  { date: '2026-06-29T17:00:00Z'   },
    75:  { date: '2026-06-29T20:00:00Z' },
    76:  { date: '2026-06-29T23:00:00Z' },
    77:  { date: '2026-06-30T17:00:00Z' },
    78:  { date: '2026-06-30T20:00:00Z' },
    79:  { date: '2026-06-30T23:00:00Z' },
    80:  { date: '2026-07-01T17:00:00Z' },
    81:  { date: '2026-07-01T20:00:00Z' },
    82:  { date: '2026-07-01T23:00:00Z' },
    83:  { date: '2026-07-02T17:00:00Z' },
    84:  { date: '2026-07-02T20:00:00Z' },
    85:  { date: '2026-07-02T23:00:00Z' },
    86:  { date: '2026-07-03T17:00:00Z' },
    87:  { date: '2026-07-03T20:00:00Z' },
    88:  { date: '2026-07-03T23:00:00Z' },
  };

  const docs = fixtures.map((f) => {
    const meta = FIXTURE_META[f.matchNumber];
    if (!meta) throw new Error(`Invalid match number: ${f.matchNumber}`);
    return {
      homeTeam:           f.homeTeamId,
      awayTeam:           f.awayTeamId,
      stage:              'round_of_32',
      matchNumber:        f.matchNumber,
      matchDatetime:      new Date(meta.date),
      predictionDeadline: new Date(new Date(meta.date).getTime() - 60 * 60 * 1000),
      status:             'upcoming',
    };
  });

  await Fixture.insertMany(docs);

  res.json({
    message: 'Round of 32 saved — 16 fixtures created',
    fixturesCreated: docs.length,
  });
});


const resetRoundOf32 = asyncHandler(async (req, res) => {
  const Fixture = require('../models/Fixture');

  // Block reset if any R32 fixture has a result already
  const completed = await Fixture.countDocuments({
    stage: 'round_of_32',
    status: 'completed',
  });
  if (completed > 0) {
    return res.status(400).json({
      error: 'Cannot reset Round of 32 — some matches already have results entered',
    });
  }

  await Fixture.deleteMany({ stage: 'round_of_32' });
  res.json({ message: 'Round of 32 fixtures cleared — you can now reassign teams' });
});


// POST /api/admin/generate-knockout/auto
// Handles R16, QF, SF, Final+3rd automatically from official bracket
const generateNextKnockoutRound = asyncHandler(async (req, res) => {
  const Fixture = require('../models/Fixture');

  const NEXT_STAGE = {
    round_of_32:  'round_of_16',
    round_of_16:  'quarterfinal',
    quarterfinal: 'semifinal',
    semifinal:    'final',
  };

  const STAGE_LABELS = {
    round_of_16:  'Round of 16',
    quarterfinal: 'Quarterfinal',
    semifinal:    'Semifinal',
    final:        'Final + Third Place',
  };

  const getWinner = (fixture) => {
    if (!fixture?.result) return null;
    return fixture.result.winner === 'home' ? fixture.homeTeam : fixture.awayTeam;
  };
  const getLoser = (fixture) => {
    if (!fixture?.result) return null;
    return fixture.result.winner === 'home' ? fixture.awayTeam : fixture.homeTeam;
  };
  const byMatch = async (matchNumber, stage) => {
    const f = await Fixture.findOne({ matchNumber, stage });
    if (!f) throw new Error(`Match ${matchNumber} (${stage}) not found`);
    const winner = getWinner(f);
    if (!winner) throw new Error(`Match ${matchNumber} has no result yet`);
    return winner;
  };

  // Determine current stage
  const STAGE_ORDER = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal'];
  const completedStages = await Fixture.distinct('stage', { status: 'completed' });

  let currentStage = null;
  for (const stage of [...STAGE_ORDER].reverse()) {
    if (completedStages.includes(stage)) {
      currentStage = stage;
      break;
    }
  }

  if (!currentStage) {
    return res.status(400).json({ error: 'No completed knockout stage found' });
  }

  // Block if current stage has incomplete fixtures
  const incomplete = await Fixture.countDocuments({
    stage: currentStage,
    status: { $ne: 'completed' },
  });
  if (incomplete > 0) {
    return res.status(400).json({
      error: `Complete all ${STAGE_LABELS[currentStage] || currentStage} fixtures first`,
    });
  }

  const nextStage = NEXT_STAGE[currentStage];
  if (!nextStage) {
    return res.status(400).json({ error: 'Tournament is already complete' });
  }

  const alreadyExists = await Fixture.countDocuments({ stage: nextStage });
  if (alreadyExists > 0) {
    return res.status(400).json({
      error: `${STAGE_LABELS[nextStage]} fixtures already exist`,
    });
  }

  // ── Round of 16 ────────────────────────────────────────────────────────────
  if (currentStage === 'round_of_32') {
    const pairings = [
      { matchNumber: 89,  homeFrom: [74,'round_of_32'], awayFrom: [77,'round_of_32'], date: '2026-07-04T17:00:00Z' },
      { matchNumber: 90,  homeFrom: [73,'round_of_32'], awayFrom: [75,'round_of_32'], date: '2026-07-04T21:00:00Z' },
      { matchNumber: 91,  homeFrom: [76,'round_of_32'], awayFrom: [78,'round_of_32'], date: '2026-07-05T17:00:00Z' },
      { matchNumber: 92,  homeFrom: [79,'round_of_32'], awayFrom: [80,'round_of_32'], date: '2026-07-05T21:00:00Z' },
      { matchNumber: 93,  homeFrom: [83,'round_of_32'], awayFrom: [84,'round_of_32'], date: '2026-07-06T17:00:00Z' },
      { matchNumber: 94,  homeFrom: [81,'round_of_32'], awayFrom: [82,'round_of_32'], date: '2026-07-06T21:00:00Z' },
      { matchNumber: 95,  homeFrom: [86,'round_of_32'], awayFrom: [88,'round_of_32'], date: '2026-07-07T17:00:00Z' },
      { matchNumber: 96,  homeFrom: [85,'round_of_32'], awayFrom: [87,'round_of_32'], date: '2026-07-07T17:00:00Z' },
    ];

    const docs = await Promise.all(pairings.map(async (p) => ({
      homeTeam:           await byMatch(p.homeFrom[0], p.homeFrom[1]),
      awayTeam:           await byMatch(p.awayFrom[0], p.awayFrom[1]),
      stage:              'round_of_16',
      matchNumber:        p.matchNumber,
      matchDatetime:      new Date(p.date),
      predictionDeadline: new Date(new Date(p.date).getTime() - 60 * 60 * 1000),
      status:             'upcoming',
    })));

    await Fixture.insertMany(docs);
    return res.json({ message: 'Round of 16 generated — 8 fixtures created', fixturesCreated: docs.length });
  }

  // ── Quarterfinals ──────────────────────────────────────────────────────────
  if (currentStage === 'round_of_16') {
    const pairings = [
      { matchNumber: 97,  homeFrom: [89,'round_of_16'], awayFrom: [90,'round_of_16'], date: '2026-07-09T21:00:00Z' },
      { matchNumber: 98,  homeFrom: [93,'round_of_16'], awayFrom: [94,'round_of_16'], date: '2026-07-10T21:00:00Z' },
      { matchNumber: 99,  homeFrom: [91,'round_of_16'], awayFrom: [92,'round_of_16'], date: '2026-07-11T17:00:00Z' },
      { matchNumber: 100, homeFrom: [95,'round_of_16'], awayFrom: [96,'round_of_16'], date: '2026-07-11T21:00:00Z' },
    ];

    const docs = await Promise.all(pairings.map(async (p) => ({
      homeTeam:           await byMatch(p.homeFrom[0], p.homeFrom[1]),
      awayTeam:           await byMatch(p.awayFrom[0], p.awayFrom[1]),
      stage:              'quarterfinal',
      matchNumber:        p.matchNumber,
      matchDatetime:      new Date(p.date),
      predictionDeadline: new Date(new Date(p.date).getTime() - 60 * 60 * 1000),
      status:             'upcoming',
    })));

    await Fixture.insertMany(docs);
    return res.json({ message: 'Quarterfinals generated — 4 fixtures created', fixturesCreated: docs.length });
  }

  // ── Semifinals ─────────────────────────────────────────────────────────────
  if (currentStage === 'quarterfinal') {
    const pairings = [
      { matchNumber: 101, homeFrom: [97,'quarterfinal'], awayFrom: [98,'quarterfinal'], date: '2026-07-14T21:00:00Z' },
      { matchNumber: 102, homeFrom: [99,'quarterfinal'], awayFrom: [100,'quarterfinal'], date: '2026-07-15T21:00:00Z' },
    ];

    const docs = await Promise.all(pairings.map(async (p) => ({
      homeTeam:           await byMatch(p.homeFrom[0], p.homeFrom[1]),
      awayTeam:           await byMatch(p.awayFrom[0], p.awayFrom[1]),
      stage:              'semifinal',
      matchNumber:        p.matchNumber,
      matchDatetime:      new Date(p.date),
      predictionDeadline: new Date(new Date(p.date).getTime() - 60 * 60 * 1000),
      status:             'upcoming',
    })));

    await Fixture.insertMany(docs);
    return res.json({ message: 'Semifinals generated — 2 fixtures created', fixturesCreated: docs.length });
  }

  // ── Third Place + Final ────────────────────────────────────────────────────
  if (currentStage === 'semifinal') {
    const sf1 = await Fixture.findOne({ matchNumber: 101, stage: 'semifinal' });
    const sf2 = await Fixture.findOne({ matchNumber: 102, stage: 'semifinal' });

    if (!sf1 || !sf2) return res.status(400).json({ error: 'Semifinal fixtures not found' });

    const finalist1   = getWinner(sf1);
    const finalist2   = getWinner(sf2);
    const thirdPlace1 = getLoser(sf1);
    const thirdPlace2 = getLoser(sf2);

    if (!finalist1 || !finalist2 || !thirdPlace1 || !thirdPlace2) {
      return res.status(400).json({ error: 'Semifinal results incomplete' });
    }

    await Fixture.insertMany([
      {
        homeTeam: thirdPlace1, awayTeam: thirdPlace2,
        stage: 'third_place', matchNumber: 103,
        matchDatetime: new Date('2026-07-18T19:00:00Z'),
        predictionDeadline: new Date('2026-07-18T18:00:00Z'),
        status: 'upcoming',
      },
      {
        homeTeam: finalist1, awayTeam: finalist2,
        stage: 'final', matchNumber: 104,
        matchDatetime: new Date('2026-07-19T20:00:00Z'),
        predictionDeadline: new Date('2026-07-19T19:00:00Z'),
        status: 'upcoming',
      },
    ]);

    return res.json({ message: 'Third Place match and Final generated — 2 fixtures created', fixturesCreated: 2 });
  }

  return res.status(400).json({ error: 'Tournament is already complete' });
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
  const { homeScore, awayScore, extraTime, penalties, penaltyHomeScore, penaltyAwayScore } = req.body;

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

  let winner = null;

  if (home > away) {
    winner = 'home';
  } else if (away > home) {
    winner = 'away';
  } else if (penalties) {
    winner =
      Number(penaltyHomeScore) > Number(penaltyAwayScore)
        ? 'home'
        : 'away';
  } else {
    winner = 'draw';
  }

fixture.result = {
  homeScore: home,
  awayScore: away,
  winner,
  extraTime: extraTime || false,
  penalties: penalties || false,
  penaltyHomeScore:
    penaltyHomeScore !== undefined ? penaltyHomeScore : null,
  penaltyAwayScore:
    penaltyAwayScore !== undefined ? penaltyAwayScore : null,
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
  saveRoundOf32,
  resetRoundOf32,
  generateNextKnockoutRound,
  getAdminFixtures,
  setFixtureResult,
};