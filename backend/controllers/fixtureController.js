const Fixture = require('../models/Fixture');
const Team = require('../models/Team');
const Prediction = require('../models/Prediction');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/fixtures
const getFixtures = asyncHandler(async (req, res) => {
  const { stage, status, group, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (stage) filter.stage = stage;
  if (status) filter.status = status;
  if (group) filter.group = group;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [fixtures, total] = await Promise.all([
    Fixture.find(filter)
      .populate('homeTeam', 'name shortName logo flagUrl country code')
      .populate('awayTeam', 'name shortName logo flagUrl country code')
      .sort({ matchDatetime: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Fixture.countDocuments(filter),
  ]);

  // Add prediction open status
  const now = new Date();
  const enriched = fixtures.map((f) => {
    const obj = f.toObject();
    obj.isPredictionOpen = f.status === 'upcoming' && now < f.predictionDeadline;
    return obj;
  });

  res.json({
    fixtures: enriched,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// GET /api/fixtures/:id
const getFixture = asyncHandler(async (req, res) => {
  const fixture = await Fixture.findById(req.params.id)
    .populate('homeTeam', 'name shortName logo flagUrl country code confederation')
    .populate('awayTeam', 'name shortName logo flagUrl country code confederation');

  if (!fixture) {
    return res.status(404).json({ error: 'Fixture not found' });
  }

  const obj = fixture.toObject();
  obj.isPredictionOpen = fixture.isPredictionOpen;

  res.json({ fixture: obj });
});

// GET /api/fixtures/upcoming
const getUpcoming = asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;
  const now = new Date();

  const fixtures = await Fixture.find({
    matchDatetime: { $gte: now },
    status: 'upcoming',
  })
    .populate('homeTeam', 'name shortName logo flagUrl code')
    .populate('awayTeam', 'name shortName logo flagUrl code')
    .sort({ matchDatetime: 1 })
    .limit(parseInt(limit));

  const enriched = fixtures.map((f) => {
    const obj = f.toObject();
    obj.isPredictionOpen = f.isPredictionOpen;
    return obj;
  });

  res.json({ fixtures: enriched });
});


// GET /api/fixtures/live

const getLive = asyncHandler(async (req, res) => {
  const fixtures = await Fixture.find({ status: 'live '})
    .populate('homeTeam', 'name shortName logo flagUrl code')
    .populate('awayTeam', 'name shortName logo flagUrl code')
    .sort({ matchDatetime: 1 })

  res.json({ fixtures })
})


// GET /api/fixtures/stage/:stage
const getByStage = asyncHandler(async (req, res) => {
  const fixtures = await Fixture.find({ stage: req.params.stage })
    .populate('homeTeam', 'name shortName logo flagUrl code')
    .populate('awayTeam', 'name shortName logo flagUrl code')
    .sort({ matchDatetime: 1 });

  res.json({ fixtures });
});


// ADMIN: POST /api/fixtures
const createFixture = asyncHandler(async (req, res) => {
  const {
    homeTeamId, awayTeamId,
    matchDatetime, stage, group, matchNumber,
  } = req.body;

  const [homeTeam, awayTeam] = await Promise.all([
    Team.findById(homeTeamId),
    Team.findById(awayTeamId),
  ]);

  if (!homeTeam || !awayTeam) {
    return res.status(404).json({ error: 'One or both teams not found' });
  }

  const kickoff = new Date(matchDatetime);
  const predictionDeadline = new Date(kickoff.getTime() - 60 * 60 * 1000);

  const fixture = await Fixture.create({
    homeTeam: homeTeamId,
    awayTeam: awayTeamId,
    matchDatetime: kickoff,
    predictionDeadline,
    stage,
    group,
    matchNumber,
  });

  await fixture.populate([
    { path: 'homeTeam', select: 'name shortName logo flagUrl code' },
    { path: 'awayTeam', select: 'name shortName logo flagUrl code' },
  ]);

  res.status(201).json({ fixture });
});


// ADMIN: PUT /api/fixtures/:id
const updateFixture = asyncHandler(async (req, res) => {
  const fixture = await Fixture.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('homeTeam awayTeam');

  if (!fixture) {
    return res.status(404).json({ error: 'Fixture not found' });
  }

  res.json({ fixture });
});

// ADMIN: PUT /api/fixtures/:id/result
const updateResult = asyncHandler(async (req, res) => {
  const { homeScore, awayScore, extraTime, penalties, penaltyHomeScore, penaltyAwayScore } = req.body;

  if (homeScore === undefined || homeScore === null || awayScore === undefined || awayScore === null) {
    return res.status(400).json({ error: 'homeScore and awayScore are required' });
  }

  const fixture = await Fixture.findById(req.params.id);
  if (!fixture) {
    return res.status(404).json({ error: 'Fixture not found' });
  }

  // Determine winner
  let winner;

// Normal time result
    if (parseInt(homeScore) > parseInt(awayScore)) {
      winner = 'home';
    } else if (parseInt(awayScore) > parseInt(homeScore)) {
      winner = 'away';
    } else {
      // Draw after 90 mins → check penalties
      if (penalties === true) {
        if (penaltyHomeScore == null || penaltyAwayScore == null) {
          return res.status(400).json({
            error: 'Penalty scores required when penalties is true',
          });
        }

        winner =
          parseInt(penaltyHomeScore) > parseInt(penaltyAwayScore)
            ? 'home'
            : 'away';
      } else {
        winner = 'draw';
      }
    }

  // Use $set with dot notation to force Mongoose to detect the change
  await Fixture.findByIdAndUpdate(
    fixture._id,
    {
      $set: {
        'result.homeScore':        parseInt(homeScore),
        'result.awayScore':        parseInt(awayScore),
        'result.winner':           winner,
        'result.extraTime':        extraTime === true,
        'result.penalties':        penalties === true,
        'result.penaltyHomeScore': penalties === true && penaltyHomeScore !== '' && penaltyHomeScore != null
                                     ? parseInt(penaltyHomeScore)
                                     : null,
        'result.penaltyAwayScore': penalties === true && penaltyAwayScore !== '' && penaltyAwayScore != null
                                     ? parseInt(penaltyAwayScore)
                                     : null,
        status: 'completed',
      },
    },
    { new: true }
  );

  // Fetch updated fixture with populated teams
  const updated = await Fixture.findById(fixture._id)
    .populate('homeTeam', 'name shortName flagUrl code')
    .populate('awayTeam', 'name shortName flagUrl code');

  // Trigger score calculation
  const { calculatePredictionScores } = require('../services/scoringService');
  await calculatePredictionScores(fixture._id);

  res.json({ fixture: updated, message: 'Result updated and scores calculated' });
});

// ADMIN: DELETE /api/fixtures/:id
const deleteFixture = asyncHandler(async (req, res) => {
  const fixture = await Fixture.findByIdAndDelete(req.params.id);
  if (!fixture) {
    return res.status(404).json({ error: 'Fixture not found' });
  }
  res.json({ message: 'Fixture deleted' });
});


module.exports = {
  getFixtures,
  getFixture,
  getUpcoming,
  getLive,
  getByStage,
  createFixture,
  updateFixture,
  updateResult,
  deleteFixture,
};