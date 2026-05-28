const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/leaderboard
const getLeaderboard = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find({ isActive: true, totalPoints: { $gte: 0 } })
      .select('username email avatar totalPoints stats createdAt')
      .sort({ totalPoints: -1, 'stats.exactScores': -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments({ isActive: true }),
  ]);

  // Add rank
  const ranked = users.map((u, i) => ({
    rank: skip + i + 1,
    id: u._id,
    username: u.username,
    avatar: u.avatar,
    totalPoints: u.totalPoints,
    stats: u.stats,
    accuracy: u.stats.totalPredictions > 0
      ? Math.round(
          ((u.stats.exactScores + u.stats.correctResults + u.stats.correctDraws) /
            u.stats.totalPredictions) * 100
        )
      : 0,
  }));

  res.json({
    leaderboard: ranked,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// GET /api/leaderboard/rank/:userId
const getUserRank = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const rank = await User.countDocuments({
    isActive: true,
    $or: [
      { totalPoints: { $gt: targetUser.totalPoints } },
      {
        totalPoints: targetUser.totalPoints,
        'stats.exactScores': { $gt: targetUser.stats.exactScores },
      },
    ],
  }) + 1;

  res.json({ rank, user: targetUser.username, totalPoints: targetUser.totalPoints });
});

// GET /api/leaderboard/top3
const getTop3 = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true })
    .select('username avatar totalPoints stats')
    .sort({ totalPoints: -1, 'stats.exactScores': -1 })
    .limit(3);

  const ranked = users.map((u, i) => ({
    rank: i + 1,
    id: u._id,
    username: u.username,
    avatar: u.avatar,
    totalPoints: u.totalPoints,
  }));

  res.json({ top3: ranked });
});

module.exports = { getLeaderboard, getUserRank, getTop3 };