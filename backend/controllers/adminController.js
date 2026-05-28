const User = require('../models/User');
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');
const Prediction = require('../models/Prediction');
const { asyncHandler } = require('../middleware/errorHandler');
const { recalculateAllPoints } = require('../services/scoringService');
const { recalculateGroupStandings } = require('../services/standingsService');



// GET /api/admin/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const [userCount, fixtureCount, predictionCount, completedCount] = await Promise.all([
    User.countDocuments({ isActive: true}),
    Fixture.countDocuments(),
    Prediction.countDocuments(),
    Fixture.countDocuments({ status: 'completed' }),
  ]);

  res.json({
    stats: {
      users: userCount,
      fixtures: fixtureCount,
      predictions: predictionCount,
      completedMatches: completedCount,
    }
  })
})