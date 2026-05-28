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
    User.find(filter)
      .select('-__v')
      .sort({ totalPoints: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  res.json({
    users,
    pagination: { total, page: parseInt(page), limit: parseInt(limit) },
  });
});

// PUT /api/admin/users/:id/role

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  );

  if (!user) return res.status(400).json({ error: 'User not found' });

  res.json({ user });
})