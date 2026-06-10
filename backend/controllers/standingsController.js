const { getGroupStandings, getAllGroupStandings, recalculateGroupStandings, getBestThirdPlacedTeams } = require('../services/standingsService');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/standings
const getAllStandings = asyncHandler(async (req, res) => {
  const standings = await getAllGroupStandings();
  const bestThirdPlacedTeams = await getBestThirdPlacedTeams();

  res.json({
    standings,
    bestThirdPlacedTeams,
  });
});

// GET /api/standings/:group
const getGroupStandingsRoute = asyncHandler(async (req, res) => {
  const { group } = req.params;
  const standings = await getGroupStandings(group.toUpperCase());
  res.json({ group: group.toUpperCase(), standings });
});

// POST /api/standings/recalculate (admin)
const recalculate = asyncHandler(async (req, res) => {
  await recalculateGroupStandings();
  res.json({ message: 'Group standings recalculated successfully' });
});

module.exports = { getAllStandings, getGroupStandingsRoute, recalculate };