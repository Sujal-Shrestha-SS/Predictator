const Prediction = require('../models/Prediction');
const Fixture = require('../models/Fixture');
const User = require('../models/User');

/**
 * Point system:
 * - Exact scoreline: 30 points
 * - Correct winner: 20 points
 * - Correct draw: 15 points
 * - Otherwise: 0 points
 */
const calculatePoints = (prediction, actual) => {
  const { homeScore: predHome, awayScore: predAway } = prediction;
  const { homeScore: actHome, awayScore: actAway } = actual;

  // Exact score match
  if (predHome === actHome && predAway === actAway) {
    return { points: 30, type: 'exact' };
  }

  // Determine actual result
  const actualResult = actHome > actAway ? 'home' : actAway > actHome ? 'away' : 'draw';
  const predResult = predHome > predAway ? 'home' : predAway > predHome ? 'away' : 'draw';

  // Correct draw (but wrong score)
  if (actualResult === 'draw' && predResult === 'draw') {
    return { points: 15, type: 'correct_draw' };
  }

  // Correct winner (not a draw, not exact score)
  if (actualResult !== 'draw' && actualResult === predResult) {
    return { points: 20, type: 'correct_result' };
  }

  return { points: 0, type: 'incorrect' };
};

/**
 * Calculate and store points for all predictions on a fixture
 */
const calculatePredictionScores = async (fixtureId) => {
  const fixture = await Fixture.findById(fixtureId);
  if (!fixture || fixture.status !== 'completed') {
    console.log(`Fixture ${fixtureId} not ready for scoring`);
    return;
  }

  if (fixture.scoresCalculated) {
    console.log(`Fixture ${fixtureId} already scored`);
    return;
  }

  const { homeScore, awayScore } = fixture.result;
  if (homeScore === null || awayScore === null) {
    console.log(`Fixture ${fixtureId} has no result yet`);
    return;
  }

  // Get all uncalculated predictions for this fixture
  const predictions = await Prediction.find({
    fixture: fixtureId,
    isCalculated: false,
  });

  console.log(`Calculating scores for ${predictions.length} predictions on fixture ${fixtureId}`);

  const bulkUserUpdates = [];

  for (const prediction of predictions) {
    const { points, type } = calculatePoints(
      { homeScore: prediction.homeScore, awayScore: prediction.awayScore },
      { homeScore, awayScore }
    );

    // Update prediction
    prediction.points = points;
    prediction.pointType = type;
    prediction.isCalculated = true;
    await prediction.save();

    // Track user updates
    const statField = {
      exact: 'stats.exactScores',
      correct_result: 'stats.correctResults',
      correct_draw: 'stats.correctDraws',
    }[type];

    const userUpdate = {
      userId: prediction.user,
      points,
      statField,
    };
    bulkUserUpdates.push(userUpdate);
  }

  // Bulk update users
  for (const update of bulkUserUpdates) {
    const inc = {
      totalPoints: update.points,
      'stats.totalPredictions': 1,
    };
    if (update.statField) inc[update.statField] = 1; //dynamically adding statField

    await User.findByIdAndUpdate(update.userId, { $inc: inc });
  }

  // Mark fixture as scored
  fixture.scoresCalculated = true;
  await fixture.save();

  console.log(`✅ Scored ${predictions.length} predictions for fixture ${fixtureId}`);
  return predictions.length;
};

/**
 * Recalculate all user total points from scratch (repair tool)
 */
const recalculateAllPoints = async () => {
  const users = await User.find({ isActive: true });
  
  for (const user of users) {
    const predictions = await Prediction.find({
      user: user._id,
      isCalculated: true,
    });

    const totalPoints = predictions.reduce((sum, p) => sum + (p.points || 0), 0);
    const exactScores = predictions.filter((p) => p.pointType === 'exact').length;
    const correctResults = predictions.filter((p) => p.pointType === 'correct_result').length;
    const correctDraws = predictions.filter((p) => p.pointType === 'correct_draw').length;

    await User.findByIdAndUpdate(user._id, {
      totalPoints,
      stats: {
        totalPredictions: predictions.length,
        exactScores,
        correctResults,
        correctDraws,
      },
    });
  }

  console.log(`✅ Recalculated points for ${users.length} users`);
};

module.exports = { calculatePoints, calculatePredictionScores, recalculateAllPoints };