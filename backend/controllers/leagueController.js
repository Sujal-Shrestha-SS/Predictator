const League = require('../models/League');
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const { asyncHandler } = require('../middleware/errorHandler');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a ranked leaderboard for a set of member user IDs.
 * Derives all points from the Prediction collection so it stays in sync
 * automatically whenever scoringService recalculates points — no extra writes.
 */
const buildLeagueLeaderboard = async (memberIds) => {
  // Aggregate points per user from calculated predictions
  const pointsAgg = await Prediction.aggregate([
    {
      $match: {
        user: { $in: memberIds },
        isCalculated: true,
      },
    },
    {
      $group: {
        _id: '$user',
        totalPoints: { $sum: '$points' },
        exactScores: {
          $sum: { $cond: [{ $eq: ['$pointType', 'exact'] }, 1, 0] },
        },
        correctResults: {
          $sum: { $cond: [{ $eq: ['$pointType', 'correct_result'] }, 1, 0] },
        },
        correctDraws: {
          $sum: { $cond: [{ $eq: ['$pointType', 'correct_draw'] }, 1, 0] },
        },
        totalPredictions: { $sum: 1 },
      },
    },
  ]);

  // Index aggregation results by userId string
  const pointsMap = {};
  for (const row of pointsAgg) {
    pointsMap[row._id.toString()] = row;
  }

  // Fetch member user details
  const users = await User.find({ _id: { $in: memberIds }, isActive: true })
    .select('username avatar totalPoints stats');

  // Merge aggregated league points with user profile info
  const merged = users.map((u) => {
    const agg = pointsMap[u._id.toString()] || {
      totalPoints: 0,
      exactScores: 0,
      correctResults: 0,
      correctDraws: 0,
      totalPredictions: 0,
    };
    const accuracy =
      agg.totalPredictions > 0
        ? Math.round(
            ((agg.exactScores + agg.correctResults + agg.correctDraws) /
              agg.totalPredictions) *
              100
          )
        : 0;
    return {
      id: u._id,
      username: u.username,
      avatar: u.avatar,
      totalPoints: agg.totalPoints,
      stats: {
        exactScores: agg.exactScores,
        correctResults: agg.correctResults,
        correctDraws: agg.correctDraws,
        totalPredictions: agg.totalPredictions,
      },
      accuracy,
    };
  });

  // Sort: points desc, then exactScores desc (mirrors global leaderboard)
  merged.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      b.stats.exactScores - a.stats.exactScores
  );

  // Attach rank
  return merged.map((entry, i) => ({ rank: i + 1, ...entry }));
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// POST /api/leagues
const createLeague = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'League name is required' });
  }

  // Generate a unique code (retry on collision — extremely rare)
  let code;
  let attempts = 0;
  do {
    code = League.generateCode();
    attempts++;
    if (attempts > 10) {
      return res.status(500).json({ error: 'Could not generate unique league code' });
    }
  } while (await League.exists({ code }));

  const league = await League.create({
    name: name.trim(),
    code,
    creator: req.user._id,
    members: [req.user._id],
  });

  await league.populate('creator', 'username avatar');

  res.status(201).json({ league });
});

// POST /api/leagues/join
const joinLeague = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'League code is required' });
  }

  const league = await League.findOne({ code: code.trim().toUpperCase() });
  if (!league) {
    return res.status(404).json({ error: 'League not found. Check the code and try again.' });
  }

  const alreadyMember = league.members.some(
    (m) => m.toString() === req.user._id.toString()
  );
  if (alreadyMember) {
    return res.status(409).json({ error: 'You are already a member of this league' });
  }

  league.members.push(req.user._id);
  await league.save();

  await league.populate('creator', 'username avatar');

  res.json({ league, message: `Joined "${league.name}" successfully` });
});

// GET /api/leagues — leagues the current user belongs to
const getMyLeagues = asyncHandler(async (req, res) => {
  const leagues = await League.find({ members: req.user._id })
    .populate('creator', 'username avatar')
    .sort({ createdAt: -1 });

  // Attach member count without leaking all member IDs
  const result = leagues.map((l) => ({
    id: l._id,
    name: l.name,
    code: l.code,
    creator: l.creator,
    memberCount: l.members.length,
    isAdmin: l.creator._id.toString() === req.user._id.toString(),
    createdAt: l.createdAt,
  }));

  res.json({ leagues: result });
});

// GET /api/leagues/:id — league details + leaderboard
const getLeague = asyncHandler(async (req, res) => {
  const league = await League.findById(req.params.id)
    .populate('creator', 'username avatar')
    .populate('members', 'username avatar');

  if (!league) {
    return res.status(404).json({ error: 'League not found' });
  }

  // Only members can view a league
  const isMember = league.members.some(
    (m) => m._id.toString() === req.user._id.toString()
  );
  if (!isMember) {
    return res.status(403).json({ error: 'You are not a member of this league' });
  }

  const memberIds = league.members.map((m) => m._id);
  const leaderboard = await buildLeagueLeaderboard(memberIds);

  res.json({
    league: {
      id: league._id,
      name: league.name,
      code: league.code,
      creator: league.creator,
      memberCount: league.members.length,
      isAdmin: league.creator._id.toString() === req.user._id.toString(),
      createdAt: league.createdAt,
    },
    leaderboard,
  });
});

// DELETE /api/leagues/:id/members/:userId — admin removes a member
const removeMember = asyncHandler(async (req, res) => {
  const league = await League.findById(req.params.id);
  if (!league) {
    return res.status(404).json({ error: 'League not found' });
  }

  if (league.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Only the league admin can remove members' });
  }

  if (req.params.userId === req.user._id.toString()) {
    return res.status(400).json({ error: 'Admin cannot remove themselves. Delete the league instead.' });
  }

  const before = league.members.length;
  league.members = league.members.filter(
    (m) => m.toString() !== req.params.userId
  );

  if (league.members.length === before) {
    return res.status(404).json({ error: 'User is not a member of this league' });
  }

  await league.save();
  res.json({ message: 'Member removed successfully' });
});

// POST /api/leagues/:id/leave — current user leaves a league
const leaveLeague = asyncHandler(async (req, res) => {
  const league = await League.findById(req.params.id);
  if (!league) {
    return res.status(404).json({ error: 'League not found' });
  }

  if (league.creator.toString() === req.user._id.toString()) {
    return res.status(400).json({ error: 'Admin cannot leave their own league. Delete it instead.' });
  }

  const before = league.members.length;
  league.members = league.members.filter(
    (m) => m.toString() !== req.user._id.toString()
  );

  if (league.members.length === before) {
    return res.status(404).json({ error: 'You are not a member of this league' });
  }

  await league.save();
  res.json({ message: 'You have left the league' });
});

// DELETE /api/leagues/:id — admin deletes the league
const deleteLeague = asyncHandler(async (req, res) => {
  const league = await League.findById(req.params.id);
  if (!league) {
    return res.status(404).json({ error: 'League not found' });
  }

  if (league.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Only the league admin can delete the league' });
  }

  await League.deleteOne({ _id: league._id });
  res.json({ message: `League "${league.name}" deleted` });
});

// POST /api/leagues/:id/regenerate-code — admin regenerates the invite code
const regenerateCode = asyncHandler(async (req, res) => {
  const league = await League.findById(req.params.id);
  if (!league) {
    return res.status(404).json({ error: 'League not found' });
  }

  if (league.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Only the league admin can regenerate the code' });
  }

  let code;
  let attempts = 0;
  do {
    code = League.generateCode();
    attempts++;
    if (attempts > 10) {
      return res.status(500).json({ error: 'Could not generate unique league code' });
    }
  } while (await League.exists({ code, _id: { $ne: league._id } }));

  league.code = code;
  await league.save();

  res.json({ code: league.code, message: 'League code regenerated' });
});

// GET /api/leagues/admin/all — app admin sees every league (no membership required)
const getAllLeaguesAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const [leagues, total] = await Promise.all([
    League.find(filter)
      .populate('creator', 'username email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    League.countDocuments(filter),
  ]);

  const result = leagues.map((l) => ({
    id: l._id,
    name: l.name,
    code: l.code,
    creator: l.creator,
    memberCount: l.members.length,
    createdAt: l.createdAt,
  }));

  res.json({
    leagues: result,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// GET /api/leagues/admin/:id — app admin views any league's full leaderboard
const getLeagueAdmin = asyncHandler(async (req, res) => {
  const league = await League.findById(req.params.id)
    .populate('creator', 'username avatar')
    .populate('members', 'username avatar');

  if (!league) {
    return res.status(404).json({ error: 'League not found' });
  }

  const memberIds = league.members.map((m) => m._id);
  const leaderboard = await buildLeagueLeaderboard(memberIds);

  res.json({
    league: {
      id: league._id,
      name: league.name,
      code: league.code,
      creator: league.creator,
      memberCount: league.members.length,
      isAdmin: false, // app admin is not the league creator
      createdAt: league.createdAt,
    },
    leaderboard,
  });
});

module.exports = {
  createLeague,
  joinLeague,
  getMyLeagues,
  getLeague,
  removeMember,
  leaveLeague,
  deleteLeague,
  regenerateCode,
  getAllLeaguesAdmin,
  getLeagueAdmin,
};
