const Prediction = require('../models/Prediction');
const Fixture = require('../models/Fixture');
const { asyncHandler } = require('../middleware/errorHandler');

// POST /api/predictions
const submitPrediction = asyncHandler(async (req, res) => {
  const { fixtureId, homeScore, awayScore } = req.body;

  if (homeScore === undefined || awayScore === undefined) {
    return res.status(400).json({ error: 'homeScore and awayScore are required' });
  }
  if (homeScore < 0 || awayScore < 0) {
    return res.status(400).json({ error: 'Scores must be non-negative' });
  }

  const fixture = await Fixture.findById(fixtureId);
  if (!fixture) {
    return res.status(404).json({ error: 'Fixture not found' });
  }

  // Strict deadline enforcement
  const now = new Date();
  if (now >= fixture.predictionDeadline) {
    return res.status(400).json({ error: 'Prediction deadline has passed' });
  }
  if (fixture.status !== 'upcoming') {
    return res.status(400).json({ error: 'Predictions are only allowed for upcoming matches' });
  }

  // Upsert prediction
  const prediction = await Prediction.findOneAndUpdate(
    { user: req.user._id, fixture: fixtureId },
    {
      $set: {
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        submittedAt: new Date(),
        isCalculated: false,
        points: null,
        pointType: null,
      },
    },
    { upsert: true, new: true }
  );

  // Add to user's predictions if new
  const User = require('../models/User');
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { predictions: prediction._id },
  });

  res.status(201).json({ prediction });
});

// GET /api/predictions/my
const getMyPredictions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 200, stage } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const predictionFilter = { user: req.user._id };

  let fixtureFilter = {}; 
  if (stage) fixtureFilter.stage = stage;

  const predictions = await Prediction.find(predictionFilter)
    .populate({
      path: 'fixture',
      match: stage ? { stage } : {},
      populate: [
        { path: 'homeTeam', select: 'name shortName logo flagUrl code' },
        { path: 'awayTeam', select: 'name shortName logo flagUrl code' },
      ],
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Filter out null fixtures (when stage filter didn't match)
  const filtered = predictions.filter((p) => p.fixture !== null);

  res.json({ predictions: filtered });
});

// GET /api/predictions/fixture/:fixtureId
const getFixturePrediction = asyncHandler(async (req, res) => {
  const prediction = await Prediction.findOne({
    user: req.user._id,
    fixture: req.params.fixtureId,
  });

  res.json({ prediction: prediction || null });
});

// GET /api/predictions/fixture/:fixtureId/all (admin or after deadline)
const getAllFixturePredictions = asyncHandler(async (req, res) => {
  const fixture = await Fixture.findById(req.params.fixtureId);
  if (!fixture) {
    return res.status(404).json({ error: 'Fixture not found' });
  }

  const now = new Date();
  // Only show all predictions after deadline passes or if admin
  if (now < fixture.predictionDeadline && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Predictions are hidden until deadline' });
  }

  const predictions = await Prediction.find({ fixture: req.params.fixtureId })
    .populate('user', 'username avatar')
    .sort({ points: -1 });

  res.json({ predictions });
});

// GET /api/predictions/stats
const getMyStats = asyncHandler(async (req, res) => {
  const predictions = await Prediction.find({
    user: req.user._id,
    isCalculated: true,
  });

  const stats = {
    total: predictions.length,
    exact: predictions.filter((p) => p.pointType === 'exact').length,
    correctResult: predictions.filter((p) => p.pointType === 'correct_result').length,
    correctDraw: predictions.filter((p) => p.pointType === 'correct_draw').length,
    incorrect: predictions.filter((p) => p.pointType === 'incorrect').length,
    totalPoints: predictions.reduce((sum, p) => sum + (p.points || 0), 0),
  };

  res.json({ stats });
});

module.exports = {
  submitPrediction,
  getMyPredictions,
  getFixturePrediction,
  getAllFixturePredictions,
  getMyStats,
};