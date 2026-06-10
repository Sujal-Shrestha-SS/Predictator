const mongoose = require('mongoose');
const Fixture = require('../models/Fixture');
const GroupStanding = require('../models/GroupStanding');
const Team = require('../models/Team');
require('dotenv').config();

const seedKnockoutSetup = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/predictator');
    console.log('✅ Connected to MongoDB\n');

    // Block if group stage not complete
    const incompleteGroup = await Fixture.countDocuments({
      stage: 'group_stage',
      status: { $ne: 'completed' },
    });
    if (incompleteGroup > 0) {
      console.error(`❌ ${incompleteGroup} group stage fixtures are not completed yet`);
      console.log('   Run seedResults.js first');
      process.exit(1);
    }

    // Block if R32 already exists
    const existing = await Fixture.countDocuments({ stage: 'round_of_32' });
    if (existing > 0) {
      console.log('⚠️  Round of 32 fixtures already exist — skipping');
      process.exit(0);
    }

    // Get top 2 from each group
    const W = {}; // winners
    const R = {}; // runners-up

    for (const g of 'ABCDEFGHIJKL'.split('')) {
      const standings = await GroupStanding.find({ group: g })
        .populate('team')
        .sort({ points: -1, goalDifference: -1, goalsFor: -1 });

      if (standings.length < 2) {
        console.error(`❌ Group ${g} has insufficient standings data`);
        process.exit(1);
      }

      W[g] = standings[0].team._id;
      R[g] = standings[1].team._id;

      console.log(`  Group ${g}: Winner = ${standings[0].team.shortName}, Runner-up = ${standings[1].team.shortName}`);
    }

    // Best 8 third-place teams
    const thirdPlace = [];
    for (const g of 'ABCDEFGHIJKL'.split('')) {
      const standings = await GroupStanding.find({ group: g })
        .populate('team')
        .sort({ points: -1, goalDifference: -1, goalsFor: -1 });

      if (standings[2]) {
        thirdPlace.push({
          group:          g,
          teamId:         standings[2].team._id,
          shortName:      standings[2].team.shortName,
          points:         standings[2].points,
          goalDifference: standings[2].goalDifference,
          goalsFor:       standings[2].goalsFor,
        });
      }
    }

    thirdPlace.sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor
    );

    const best8 = thirdPlace.slice(0, 8);
    console.log(`\n  Best 8 third-place teams:`);
    best8.forEach((t, i) => console.log(`    ${i + 1}. Group ${t.group}: ${t.shortName} (${t.points}pts, GD:${t.goalDifference})`));

    const t = best8.map((x) => x.teamId);
    const d = (dateStr) => new Date(dateStr);
    // Official R32 bracket with dates and cities
    const FIXTURE_META = [
        { matchNumber: 73,  label: 'Match 73', date: d('2026-06-29T00:45'),  },
        { matchNumber: 74,  label: 'Match 74', date: d('2026-06-29T22:45'),  },
        { matchNumber: 75,  label: 'Match 75', date: d('2026-06-30T02:15'),  },
        { matchNumber: 76,  label: 'Match 76', date: d('2026-06-30T06:45'),  },
        { matchNumber: 77,  label: 'Match 77', date: d('2026-06-30T22:45'),  },
        { matchNumber: 78,  label: 'Match 78', date: d('2026-07-01T02:45'),  },
        { matchNumber: 79,  label: 'Match 79', date: d('2026-07-01T06:45'),  },
        { matchNumber: 80,  label: 'Match 80', date: d('2026-07-01T21:45'),  },
        { matchNumber: 81,  label: 'Match 81', date: d('2026-07-02T01:45'),  },
        { matchNumber: 82,  label: 'Match 82', date: d('2026-07-02T05:45'),  },
        { matchNumber: 83,  label: 'Match 83', date: d('2026-07-03T00:45'),  },
        { matchNumber: 84,  label: 'Match 84', date: d('2026-07-03T04:45'),  },
        { matchNumber: 85,  label: 'Match 85', date: d('2026-07-03T08:45'),  },
        { matchNumber: 86,  label: 'Match 86', date: d('2026-07-03T23:45'),  },
        { matchNumber: 87,  label: 'Match 87', date: d('2026-07-04T03:45'),  },
        { matchNumber: 88,  label: 'Match 88', date: d('2026-07-04T07:15'),  },
  ];

    // Official R32 matchups
    const matchups = [
      { matchNumber: 73,  home: R['A'], away: R['B'] },
      { matchNumber: 74,  home: W['E'], away: t[0]   },
      { matchNumber: 75,  home: W['F'], away: R['C'] },
      { matchNumber: 76,  home: W['C'], away: R['F'] },
      { matchNumber: 77,  home: W['I'], away: t[1]   },
      { matchNumber: 78,  home: R['E'], away: R['I'] },
      { matchNumber: 79,  home: W['A'], away: t[2]   },
      { matchNumber: 80,  home: W['L'], away: t[3]   },
      { matchNumber: 81,  home: W['D'], away: t[4]   },
      { matchNumber: 82,  home: W['G'], away: t[5]   },
      { matchNumber: 83,  home: R['K'], away: R['L'] },
      { matchNumber: 84,  home: W['H'], away: R['J'] },
      { matchNumber: 85,  home: W['B'], away: t[6]   },
      { matchNumber: 86,  home: W['J'], away: R['H'] },
      { matchNumber: 87,  home: W['K'], away: t[7]   },
      { matchNumber: 88,  home: R['D'], away: R['G'] },
    ];

    const docs = matchups.map((m) => {
        const meta = FIXTURE_META.find(x => x.matchNumber === m.matchNumber);

        return {
          homeTeam: m.home,
          awayTeam: m.away,
          stage: 'round_of_32',
          matchNumber: m.matchNumber,
          matchDatetime: meta ? new Date(meta.date) : null,
          predictionDeadline: meta
            ? new Date(new Date(meta.date).getTime() - 60 * 60 * 1000)
            : null,
          status: 'upcoming',
        };
      });

    await Fixture.insertMany(docs);
    console.log(`\n✅ Round of 32 fixtures created — 16 matches inserted`);
    console.log('   Now run seedResults.js to complete Round of 32 results');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seedKnockoutSetup();