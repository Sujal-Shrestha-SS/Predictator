const User = require('../models/User');
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');
const Prediction = require('../models/Prediction');
const { asyncHandler } = require('../middleware/errorHandler');
const { calculatePredictionScores, recalculateAllPoints } = require('../services/scoringService');
const { recalculateGroupStandings } = require('../services/standingsService');

// GET /api/admin/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const NEXT_STAGE_LABEL = {
    group_stage:  'Round of 32',
    round_of_32:  'Round of 16',
    round_of_16:  'Quarterfinal',
    quarterfinal: 'Semifinal',
    semifinal:    'Final',
  };

  const [users, fixtures, predictions, completedMatches] = await Promise.all([
    User.countDocuments(),
    Fixture.countDocuments(),
    Prediction.countDocuments(),
    Fixture.countDocuments({ status: 'completed' }),
  ]);

  // Determine next knockout stage to generate
  const completedStages = await Fixture.distinct('stage', { status: 'completed' });
  const STAGE_ORDER = ['group_stage','round_of_32','round_of_16','quarterfinal','semifinal'];
  let nextKnockoutStage = 'Round of 32';
  for (const stage of [...STAGE_ORDER].reverse()) {
    if (completedStages.includes(stage)) {
      nextKnockoutStage = NEXT_STAGE_LABEL[stage] || 'Tournament Complete';
      break;
    }
  }

  res.json({
    stats: {
      users,
      fixtures,
      predictions,
      completedMatches,
      nextKnockoutStage,
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

// POST /api/admin/generate-knockout
const generateKnockout = asyncHandler(async (req, res) => {
  const Fixture = require('../models/Fixture');
  const GroupStanding = require('../models/GroupStanding');

  const STAGE_LABELS = {
    round_of_32:  'Round of 32',
    round_of_16:  'Round of 16',
    quarterfinal: 'Quarterfinal',
    semifinal:    'Semifinal',
    third_place:  'Third Place',
    final:        'Final',
  };

 

  // ── Helper: get top N from a group ──────────────────────────────────────────
  const getGroupStandings = async (group) => {
    return GroupStanding.find({ group })
      .populate('team')
      .sort({ points: -1, goalDifference: -1, goalsFor: -1 });
  };

  const getWinner = (fixture) => {
    if (!fixture.result) return null;
    return fixture.result.winner === 'home' ? fixture.homeTeam : fixture.awayTeam;
  };

  const getLoser = (fixture) => {
    if (!fixture.result) return null;
    return fixture.result.winner === 'home' ? fixture.awayTeam : fixture.homeTeam;
  };

  // ── Determine next stage ────────────────────────────────────────────────────
  const STAGE_ORDER = [
    'group_stage', 'round_of_32', 'round_of_16',
    'quarterfinal', 'semifinal',
  ];

  const NEXT_STAGE = {
    group_stage:  'round_of_32',
    round_of_32:  'round_of_16',
    round_of_16:  'quarterfinal',
    quarterfinal: 'semifinal',
    semifinal:    'final',
  };

  const completedStages = await Fixture.distinct('stage', { status: 'completed' });

  let currentStage = null;
  for (const stage of [...STAGE_ORDER].reverse()) {
    if (completedStages.includes(stage)) {
      currentStage = stage;
      break;
    }
  }

  if (!currentStage) {
    return res.status(400).json({ error: 'No completed stages found' });
  }

  // Block if current stage has incomplete fixtures
  const incompleteCurrent = await Fixture.countDocuments({
    stage: currentStage,
    status: { $ne: 'completed' },
  });
  if (incompleteCurrent > 0) {
    return res.status(400).json({
      error: `Complete all ${STAGE_LABELS[currentStage] || currentStage} fixtures before generating the next round`,
    });
  }

  const nextStage = NEXT_STAGE[currentStage];
  if (!nextStage) {
    return res.status(400).json({ error: 'Tournament is already complete' });
  }

  // Block if next stage already exists
  const alreadyExists = await Fixture.countDocuments({ stage: nextStage });
  if (alreadyExists > 0) {
    return res.status(400).json({
      error: `${STAGE_LABELS[nextStage]} fixtures already exist`,
    });
  }

  // ── ROUND OF 32 ─────────────────────────────────────────────────────────────
  if (currentStage === 'group_stage') {

    // Get standings for all 12 groups
    const standings = {};
    for (const g of 'ABCDEFGHIJKL'.split('')) {
      standings[g] = await getGroupStandings(g);
    }

    // Winners and runners-up
    const W = {}; // group winners
    const R = {}; // group runners-up
    for (const g of 'ABCDEFGHIJKL'.split('')) {
      if (standings[g].length < 2) {
        return res.status(400).json({ error: `Group ${g} standings incomplete` });
      }
      W[g] = standings[g][0].team._id;
      R[g] = standings[g][1].team._id;
    }

    // Best 4 third-placed teams
    // Collect all 3rd place teams across all groups
    const thirdPlace = [];
    for (const g of 'ABCDEFGHIJKL'.split('')) {
      if (standings[g][2]) {
        thirdPlace.push({
          group: g,
          teamId: standings[g][2].team._id,
          points:          standings[g][2].points,
          goalDifference:  standings[g][2].goalDifference,
          goalsFor:        standings[g][2].goalsFor,
        });
      }
    }

    // Sort third place teams — best 4 qualify
    thirdPlace.sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor
    );
    const best4Third = thirdPlace.slice(0, 4);
    const best4Groups = best4Third.map((t) => t.group).sort().join(''); // e.g. "ABCE"

    // Third place team assignment to matches depends on which 4 groups qualify.
    // Official FIFA assignment table for WC 2026 (12-group format):
    // This maps the combination of qualifying groups to which match gets which 3rd place team.
    // Simplified: assign best4Third[0..3] to the 4 matches that need a 3rd place team
    // Matches 74, 77, 79, 80, 81, 82, 85, 87 can get 3rd place teams depending on bracket
    // For WC 2026 the specific slot depends on which groups the 3rd place teams come from.
    // We assign them in rank order to the slots in match number order.
    const t3 = best4Third.map((t) => t.teamId);

    // Official Round of 32 bracket
    // Match 73:  R[A] vs R[B]
    // Match 74:  W[E] vs best 3rd (from A/B/C/D/F)
    // Match 75:  W[F] vs R[C]
    // Match 76:  W[C] vs R[F]
    // Match 77:  W[I] vs best 3rd (from C/D/F/G/H)
    // Match 78:  R[E] vs R[I]
    // Match 79:  W[A] vs best 3rd (from C/E/F/H/I)
    // Match 80:  W[L] vs best 3rd (from E/H/I/J/K)
    // Match 81:  W[D] vs best 3rd (from B/E/F/I/J)
    // Match 82:  W[G] vs best 3rd (from A/E/H/I/J) — but we only have 4 3rd place slots
    // Match 83:  R[K] vs R[L]
    // Match 84:  W[H] vs R[J]
    // Match 85:  W[B] vs best 3rd (from E/F/G/I/J)
    // Match 86:  W[J] vs R[H]
    // Match 87:  W[K] vs best 3rd (from D/E/I/J/L)
    // Match 88:  R[D] vs R[G]

    // Assign the 4 third place teams to the 4 third-place slots (matches 74,77,79,80 in order)
    // This is the simplified version — exact slot depends on FIFA's official assignment table
    // which is determined after group stage ends. For app purposes rank order is sufficient.
    const thirdPlaceSlots = [t3[0], t3[1], t3[2], t3[3]];

    const r32Fixtures = [
      { matchNumber: 73,  home: R['A'], away: R['B'], date: '2026-06-28T17:00:00Z'  },
      { matchNumber: 74,  home: W['E'], away: thirdPlaceSlots[0], date: '2026-06-29T17:00:00Z'      },
      { matchNumber: 75,  home: W['F'], away: R['C'], date: '2026-06-29T20:00:00Z'  },
      { matchNumber: 76,  home: W['C'], away: R['F'], date: '2026-06-29T23:00:00Z'     },
      { matchNumber: 77,  home: W['I'], away: thirdPlaceSlots[1], date: '2026-06-30T17:00:00Z'  },
      { matchNumber: 78,  home: R['E'], away: R['I'], date: '2026-06-30T20:00:00Z' },
      { matchNumber: 79,  home: W['A'], away: thirdPlaceSlots[2], date: '2026-06-30T23:00:00Z' },
      { matchNumber: 80,  home: W['L'], away: thirdPlaceSlots[3], date: '2026-07-01T17:00:00Z' },
      { matchNumber: 81,  home: W['D'], away: t3[0],              date: '2026-07-01T20:00:00Z' },
      { matchNumber: 82,  home: W['G'], away: t3[1],              date: '2026-07-01T23:00:00Z' },
      { matchNumber: 83,  home: R['K'], away: R['L'], date: '2026-07-02T17:00:00Z' },
      { matchNumber: 84,  home: W['H'], away: R['J'], date: '2026-07-02T20:00:00Z' },
      { matchNumber: 85,  home: W['B'], away: t3[2],              date: '2026-07-02T23:00:00Z' },
      { matchNumber: 86,  home: W['J'], away: R['H'], date: '2026-07-03T17:00:00Z' },
      { matchNumber: 87,  home: W['K'], away: t3[3],              date: '2026-07-03T20:00:00Z' },
      { matchNumber: 88,  home: R['D'], away: R['G'], date: '2026-07-03T23:00:00Z' },
    ];

    const docs = r32Fixtures.map((f) => ({
      homeTeam:           f.home,
      awayTeam:           f.away,
      stage:              'round_of_32',
      matchNumber:        f.matchNumber,
      matchDatetime:      new Date(f.date),
      predictionDeadline: new Date(new Date(f.date).getTime() - 60 * 60 * 1000),
      status:             'upcoming',
    }));

    await Fixture.insertMany(docs);
    return res.json({
      message: 'Round of 32 generated — 16 fixtures created',
      stage: 'round_of_32',
      fixturesCreated: docs.length,
    });
  }

  // ── ROUND OF 16 ─────────────────────────────────────────────────────────────
  // Official bracket: winner of match X plays winner of match Y
  if (currentStage === 'round_of_32') {
    const getMatchWinner = async (matchNumber) => {
      const fixture = await Fixture.findOne({ matchNumber, stage: 'round_of_32' });
      if (!fixture) throw new Error(`Match ${matchNumber} not found`);
      return getWinner(fixture);
    };

    // Official Round of 16 pairings from the document
    const pairings = [
      { matchNumber: 89, home: await getMatchWinner(74), away: await getMatchWinner(77), date: '2026-07-04T17:00:00Z'  },
      { matchNumber: 90, home: await getMatchWinner(73), away: await getMatchWinner(75), date: '2026-07-04T21:00:00Z'  },
      { matchNumber: 91, home: await getMatchWinner(76), away: await getMatchWinner(78), date: '2026-07-05T17:00:00Z'  },
      { matchNumber: 92, home: await getMatchWinner(79), away: await getMatchWinner(80), date: '2026-07-05T21:00:00Z' },
      { matchNumber: 93, home: await getMatchWinner(83), away: await getMatchWinner(84), date: '2026-07-06T17:00:00Z' },
      { matchNumber: 94, home: await getMatchWinner(81), away: await getMatchWinner(82), date: '2026-07-06T21:00:00Z' },
      { matchNumber: 95, home: await getMatchWinner(86), away: await getMatchWinner(88), date: '2026-07-07T17:00:00Z' },
      { matchNumber: 96, home: await getMatchWinner(85), away: await getMatchWinner(87), date: '2026-07-07T21:00:00Z' },
    ];

    const docs = pairings.map((f) => ({
      homeTeam:           f.home,
      awayTeam:           f.away,
      stage:              'round_of_16',
      matchNumber:        f.matchNumber,
      matchDatetime:      new Date(f.date),
      predictionDeadline: new Date(new Date(f.date).getTime() - 60 * 60 * 1000),
      status:             'upcoming',
    }));

    await Fixture.insertMany(docs);
    return res.json({
      message: 'Round of 16 generated — 8 fixtures created',
      stage: 'round_of_16',
      fixturesCreated: docs.length,
    });
  }

  // ── QUARTERFINALS ───────────────────────────────────────────────────────────
  if (currentStage === 'round_of_16') {
    const getMatchWinner = async (matchNumber) => {
      const fixture = await Fixture.findOne({ matchNumber, stage: 'round_of_16' });
      if (!fixture) throw new Error(`Match ${matchNumber} not found`);
      return getWinner(fixture);
    };

    const pairings = [
      { matchNumber: 97,  home: await getMatchWinner(89), away: await getMatchWinner(90), date: '2026-07-09T21:00:00Z' },
      { matchNumber: 98,  home: await getMatchWinner(93), away: await getMatchWinner(94), date: '2026-07-10T21:00:00Z' },
      { matchNumber: 99,  home: await getMatchWinner(91), away: await getMatchWinner(92), date: '2026-07-11T17:00:00Z' },
      { matchNumber: 100, home: await getMatchWinner(95), away: await getMatchWinner(96), date: '2026-07-11T21:00:00Z' },
    ];

    const docs = pairings.map((f) => ({
      homeTeam:           f.home,
      awayTeam:           f.away,
      stage:              'quarterfinal',
      matchNumber:        f.matchNumber,
      matchDatetime:      new Date(f.date),
      predictionDeadline: new Date(new Date(f.date).getTime() - 60 * 60 * 1000),
      status:             'upcoming',
    }));

    await Fixture.insertMany(docs);
    return res.json({
      message: 'Quarterfinals generated — 4 fixtures created',
      stage: 'quarterfinal',
      fixturesCreated: docs.length,
    });
  }

  // ── SEMIFINALS ──────────────────────────────────────────────────────────────
  if (currentStage === 'quarterfinal') {
    const getMatchWinner = async (matchNumber) => {
      const fixture = await Fixture.findOne({ matchNumber, stage: 'quarterfinal' });
      if (!fixture) throw new Error(`Match ${matchNumber} not found`);
      return getWinner(fixture);
    };

    const pairings = [
      { matchNumber: 101, home: await getMatchWinner(97), away: await getMatchWinner(98),  date: '2026-07-14T21:00:00Z'   },
      { matchNumber: 102, home: await getMatchWinner(99), away: await getMatchWinner(100), date: '2026-07-15T21:00:00Z' },
    ];

    const docs = pairings.map((f) => ({
      homeTeam:           f.home,
      awayTeam:           f.away,
      stage:              'semifinal',
      matchNumber:        f.matchNumber,
      matchDatetime:      new Date(f.date),
      predictionDeadline: new Date(new Date(f.date).getTime() - 60 * 60 * 1000),
      status:             'upcoming',
    }));

    await Fixture.insertMany(docs);
    return res.json({
      message: 'Semifinals generated — 2 fixtures created',
      stage: 'semifinal',
      fixturesCreated: docs.length,
    });
  }

  // ── THIRD PLACE + FINAL ─────────────────────────────────────────────────────
  if (currentStage === 'semifinal') {
    const sf1 = await Fixture.findOne({ matchNumber: 101, stage: 'semifinal' });
    const sf2 = await Fixture.findOne({ matchNumber: 102, stage: 'semifinal' });

    if (!sf1 || !sf2) {
      return res.status(400).json({ error: 'Semifinal fixtures not found' });
    }

    const finalist1     = getWinner(sf1);
    const finalist2     = getWinner(sf2);
    const thirdPlace1   = getLoser(sf1);
    const thirdPlace2   = getLoser(sf2);

    if (!finalist1 || !finalist2 || !thirdPlace1 || !thirdPlace2) {
      return res.status(400).json({ error: 'Semifinal results incomplete' });
    }

    const docs = [
      {
        homeTeam:           thirdPlace1,
        awayTeam:           thirdPlace2,
        stage:              'third_place',
        matchNumber:        103,
        matchDatetime:      new Date('2026-07-18T19:00:00Z'),
        predictionDeadline: new Date('2026-07-18T18:00:00Z'),
        status:             'upcoming',
      },
      {
        homeTeam:           finalist1,
        awayTeam:           finalist2,
        stage:              'final',
        matchNumber:        104,
        matchDatetime:      new Date('2026-07-19T20:00:00Z'),
        predictionDeadline: new Date('2026-07-19T19:00:00Z'),
        status:             'upcoming',
       
      },
    ];

    await Fixture.insertMany(docs);
    return res.json({
      message: 'Third Place match and Final generated — 2 fixtures created',
      stage: 'final',
      fixturesCreated: docs.length,
    });
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