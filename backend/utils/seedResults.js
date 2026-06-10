const mongoose = require('mongoose');
const Fixture = require('../models/Fixture');
const Prediction = require('../models/Prediction');
const { calculatePredictionScores } = require('../services/scoringService');
const { recalculateGroupStandings } = require('../services/standingsService');
require('dotenv').config();

const randomScore = () => {
  const scores = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4];
  return scores[Math.floor(Math.random() * scores.length)];
};

const randomKnockoutResult = () => {
  let homeScore = randomScore();
  let awayScore = randomScore();

  if (homeScore === awayScore) {
    const penaltyWinner = Math.random() > 0.5 ? 'home' : 'away';
    return {
      homeScore,
      awayScore,
      winner: penaltyWinner,
      extraTime: true,
      penalties: true,
      penaltyHomeScore: penaltyWinner === 'home' ? 5 : 4,
      penaltyAwayScore: penaltyWinner === 'away' ? 5 : 4,
    };
  }

  return {
    homeScore,
    awayScore,
    winner: homeScore > awayScore ? 'home' : 'away',
    extraTime: false,
    penalties: false,
    penaltyHomeScore: null,
    penaltyAwayScore: null,
  };
};

const completeFixturesByStage = async (stage) => {
  const fixtures = await Fixture.find({
    stage,
    status: { $ne: 'completed' },
  }).populate('homeTeam awayTeam');

  if (fixtures.length === 0) {
    console.log(`⚠️  No pending ${stage} fixtures found`);
    return 0;
  }

  console.log(`\n📅 Found ${fixtures.length} ${stage} fixtures`);

  let completed = 0;

  for (const fixture of fixtures) {
    if (!fixture.homeTeam || !fixture.awayTeam) {
      console.log(`  ⚠️  Match #${fixture.matchNumber} skipped — teams not assigned yet`);
      continue;
    }

    // Group stage uses regular score, knockout must have a winner
    const result = stage === 'group_stage' ? {
      homeScore: randomScore(),
      awayScore: randomScore(),
      winner: null, // calculated below
      extraTime: false,
      penalties: false,
      penaltyHomeScore: null,
      penaltyAwayScore: null,
    } : randomKnockoutResult();

    // Set winner for group stage results
    if (stage === 'group_stage') {
      if (result.homeScore > result.awayScore) result.winner = 'home';
      else if (result.awayScore > result.homeScore) result.winner = 'away';
      else result.winner = 'draw';
    }

    fixture.result = result;
    fixture.status = 'completed';
    await fixture.save();

    // Update group standings after each group stage result
    if (stage === 'group_stage') {
      await recalculateGroupStandings();
    }

    const predictionCount = await Prediction.countDocuments({ fixture: fixture._id });
    if (predictionCount > 0) {
      await calculatePredictionScores(fixture._id);
    }

    const home  = fixture.homeTeam?.shortName || 'TBD';
    const away  = fixture.awayTeam?.shortName || 'TBD';
    const score = `${result.homeScore}:${result.awayScore}`;
    const extra = result.penalties
      ? ` (pens ${result.penaltyHomeScore}:${result.penaltyAwayScore})`
      : result.extraTime ? ' (AET)' : '';

    console.log(`  ✓ Match #${fixture.matchNumber} ${home} vs ${away} — ${score}${extra} → ${result.winner}`);
    completed++;
  }

  return completed;
};

const STAGE_FLOW = [
  {
    key: 'group_stage',
    label: 'Group stage',
    next: '→ Go to Admin → Tools → Set Up Round of 32\n   → Assign the 32 qualified teams to their matches\n   → Then run this script again',
  },
  {
    key: 'round_of_32',
    label: 'Round of 32',
    next: '→ Go to Admin → Tools → Generate Round of 16\n   → Then run this script again',
  },
  {
    key: 'round_of_16',
    label: 'Round of 16',
    next: '→ Go to Admin → Tools → Generate Quarterfinals\n   → Then run this script again',
  },
  {
    key: 'quarterfinal',
    label: 'Quarterfinals',
    next: '→ Go to Admin → Tools → Generate Semifinals\n   → Then run this script again',
  },
  {
    key: 'semifinal',
    label: 'Semifinals',
    next: '→ Go to Admin → Tools → Generate Final + Third Place\n   → Then run this script again',
  },
];

const seedResults = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/predictator');
    console.log('✅ Connected to MongoDB\n');

    const pendingByStage = await Fixture.aggregate([
      { $match: { status: { $ne: 'completed' } } },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]);

    if (pendingByStage.length === 0) {
      console.log('✅ All fixtures are already completed — tournament is done!');
      process.exit(0);
    }

    console.log('Pending fixtures by stage:');
    pendingByStage.forEach((s) => console.log(`  ${s._id}: ${s.count} pending`));

    // Find the earliest pending stage following the official flow
    for (const stage of STAGE_FLOW) {
      const pending = pendingByStage.find((s) => s._id === stage.key);
      if (!pending) continue;

      const done = await completeFixturesByStage(stage.key);
      console.log(`\n✅ ${stage.label}: ${done} fixtures completed`);

      if (stage.next) {
        console.log(`\n   Next step:`);
        console.log(`   ${stage.next}`);
      }

      process.exit(0);
    }

    // Handle third place + final (both complete in one run)
    const thirdPending = pendingByStage.find((s) => s._id === 'third_place');
    const finalPending = pendingByStage.find((s) => s._id === 'final');

    if (thirdPending || finalPending) {
      if (thirdPending) await completeFixturesByStage('third_place');
      if (finalPending) await completeFixturesByStage('final');
      console.log('\n🏆 Tournament complete! All fixtures seeded.');
      process.exit(0);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seedResults();