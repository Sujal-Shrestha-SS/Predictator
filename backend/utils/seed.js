const mongoose = require('mongoose');
const Team = require('../models/Team');
const Fixture = require('../models/Fixture');
const GroupStanding = require('../models/GroupStanding');
const User = require('../models/User');
const Prediction = require('../models/Prediction');

require('dotenv').config();

// All 48 FIFA World Cup 2026 Teams


const WC_2026_TEAMS = [
  // Group A
  { name: 'Mexico',          shortName: 'MEX', code: 'MEX', group: 'A', confederation: 'CONCACAF', flagUrl: 'https://flagcdn.com/mx.svg' },
  { name: 'South Africa',    shortName: 'RSA', code: 'RSA', group: 'A', confederation: 'CAF', flagUrl: 'https://flagcdn.com/za.svg' },
  { name: 'South Korea',     shortName: 'KOR', code: 'KOR', group: 'A', confederation: 'AFC',      flagUrl: 'https://flagcdn.com/kr.svg' },
  { name: 'Czech Republic',  shortName: 'CZE', code: 'CZE', group: 'A', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/cz.svg' },

  // Group B
  { name: 'Canada',                  shortName: 'CAN', code: 'CAN', group: 'B', confederation: 'CONCACAF', flagUrl: 'https://flagcdn.com/ca.svg' },
  { name: 'Bosnia and Herzegovina',  shortName: 'BIH', code: 'BIH', group: 'B', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/ba.svg' },
  { name: 'Qatar',                   shortName: 'QAT', code: 'QAT', group: 'B', confederation: 'AFC',      flagUrl: 'https://flagcdn.com/qa.svg' },
  { name: 'Switzerland',             shortName: 'SUI', code: 'SUI', group: 'B', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/ch.svg' },

  // Group C
  { name: 'Brazil',        shortName: 'BRA', code: 'BRA', group: 'C', confederation: 'CONMEBOL', flagUrl: 'https://flagcdn.com/br.svg' },
  { name: 'Morocco',       shortName: 'MAR', code: 'MAR', group: 'C', confederation: 'CAF',      flagUrl: 'https://flagcdn.com/ma.svg' },
  { name: 'Haiti',         shortName: 'HTI', code: 'HTI', group: 'C', confederation: 'CONCACAF', flagUrl: 'https://flagcdn.com/ht.svg' },
  { name: 'Scotland',      shortName: 'SCT', code: 'SCT', group: 'C', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/gb-sct.svg' },

  // Group D
  { name: 'USA',        shortName: 'USA', code: 'USA', group: 'D', confederation: 'CONCACAF', flagUrl: 'https://flagcdn.com/us.svg' },
  { name: 'Paraguay',   shortName: 'PAR', code: 'PAR', group: 'D', confederation: 'CONMEBOL', flagUrl: 'https://flagcdn.com/py.svg' },
  { name: 'Australia',  shortName: 'AUS', code: 'AUS', group: 'D', confederation: 'AFC',      flagUrl: 'https://flagcdn.com/au.svg' },
  { name: 'Turkey',     shortName: 'TUR', code: 'TUR', group: 'D', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/tr.svg' },

  // Group E
  { name: 'Germany',        shortName: 'GER', code: 'GER', group: 'E', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/de.svg' },
  { name: 'Curacao',        shortName: 'CUR', code: 'CUR', group: 'E', confederation: 'CONCACAF', flagUrl: 'https://flagcdn.com/cw.svg' },
  { name: 'Ivory Coast',    shortName: 'CIV', code: 'CIV', group: 'E', confederation: 'CAF',      flagUrl: 'https://flagcdn.com/ci.svg' },
  { name: 'Ecuador',        shortName: 'ECU', code: 'ECU', group: 'E', confederation: 'CONMEBOL', flagUrl: 'https://flagcdn.com/ec.svg' },

  // Group F
  { name: 'Netherlands',      shortName: 'NED', code: 'NED', group: 'F', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/nl.svg' },
  { name: 'Japan',            shortName: 'JPN', code: 'JPN', group: 'F', confederation: 'AFC',      flagUrl: 'https://flagcdn.com/jp.svg' },
  { name: 'Sweden',           shortName: 'SWE', code: 'SWE', group: 'F', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/se.svg' },
  { name: 'Tunisia',          shortName: 'TUN', code: 'TUN', group: 'F', confederation: 'CAF',      flagUrl: 'https://flagcdn.com/tn.svg' },

  // Group G
  { name: 'Belgium',       shortName: 'BEL', code: 'BEL', group: 'G', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/be.svg' },
  { name: 'Egypt',         shortName: 'EGY', code: 'EGY', group: 'G', confederation: 'CAF',      flagUrl: 'https://flagcdn.com/eg.svg' },
  { name: 'Iran',          shortName: 'IRN', code: 'IRN', group: 'G', confederation: 'AFC',      flagUrl: 'https://flagcdn.com/ir.svg' },
  { name: 'New Zealand',   shortName: 'NZL', code: 'NZL', group: 'G', confederation: 'OFC',      flagUrl: 'https://flagcdn.com/nz.svg' },

  // Group H
  { name: 'Spain',         shortName: 'ESP', code: 'ESP', group: 'H', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/es.svg' },
  { name: 'Cape Verde',    shortName: 'CPV', code: 'CPV', group: 'H', confederation: 'CAF',      flagUrl: 'https://flagcdn.com/cv.svg' },
  { name: 'Saudi Arabia',  shortName: 'KSA', code: 'KSA', group: 'H', confederation: 'AFC',      flagUrl: 'https://flagcdn.com/sa.svg' },
  { name: 'Uruguay',       shortName: 'URU', code: 'URU', group: 'H', confederation: 'CONMEBOL', flagUrl: 'https://flagcdn.com/uy.svg' },

  // Group I
  { name: 'France',        shortName: 'FRA', code: 'FRA', group: 'I', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/fr.svg' },
  { name: 'Senegal',       shortName: 'SEN', code: 'SEN', group: 'I', confederation: 'CAF',      flagUrl: 'https://flagcdn.com/sn.svg' },
  { name: 'Iraq',          shortName: 'IRQ', code: 'IRQ', group: 'I', confederation: 'AFC',      flagUrl: 'https://flagcdn.com/iq.svg' },
  { name: 'Norway',        shortName: 'NOR', code: 'NOR', group: 'I', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/no.svg' },

  // Group J
  { name: 'Argentina',       shortName: 'ARG', code: 'ARG', group: 'J', confederation: 'CONMEBOL', flagUrl: 'https://flagcdn.com/ar.svg' },
  { name: 'Algeria',         shortName: 'ALG', code: 'ALG', group: 'J', confederation: 'CAF',      flagUrl: 'https://flagcdn.com/dz.svg' },
  { name: 'Austria',         shortName: 'AUT', code: 'AUT', group: 'J', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/at.svg' },
  { name: 'Jordan',          shortName: 'JOR', code: 'JOR', group: 'J', confederation: 'AFC',      flagUrl: 'https://flagcdn.com/jo.svg' },

  // Group K
  { name: 'Portugal',       shortName: 'POR', code: 'POR', group: 'K', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/pt.svg' },
  { name: 'DR Congo',       shortName: 'COD', code: 'COD', group: 'K', confederation: 'CAF', flagUrl: 'https://flagcdn.com/cd.svg' },
  { name: 'Uzbekistan',     shortName: 'UZB', code: 'UZB', group: 'K', confederation: 'AFC', flagUrl: 'https://flagcdn.com/uz.svg' },
  { name: 'Colombia',       shortName: 'COL', code: 'COL', group: 'K', confederation: 'CONMEBOL', flagUrl: 'https://flagcdn.com/co.svg' },

  // Group L
  { name: 'England',       shortName: 'ENG', code: 'ENG', group: 'L', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/gb-eng.svg' },
  { name: 'Croatia',       shortName: 'CRO', code: 'CRO', group: 'L', confederation: 'UEFA',     flagUrl: 'https://flagcdn.com/hr.svg' },
  { name: 'Ghana',         shortName: 'GHA', code: 'GHA', group: 'L', confederation: 'CAF',      flagUrl: 'https://flagcdn.com/gh.svg' },
  { name: 'Panama',        shortName: 'PAN', code: 'PAN', group: 'L', confederation: 'CONCACAF', flagUrl: 'https://flagcdn.com/pa.svg' },
];


const d = (dateStr) => new Date(dateStr); // helper

const GROUP_FIXTURES = [

  // ─────────────────────────────────────────
  // GROUP A
  // ─────────────────────────────────────────
  { matchNumber: 1,  home: 'MEX', away: 'RSA', matchDatetime: d('2026-06-12T00:45'), group: 'A' },
  { matchNumber: 2,  home: 'KOR', away: 'CZE', matchDatetime: d('2026-06-12T07:45'), group: 'A' },
  { matchNumber: 25, home: 'CZE', away: 'RSA', matchDatetime: d('2026-06-18T21:45'), group: 'A' },
  { matchNumber: 28, home: 'MEX', away: 'KOR', matchDatetime: d('2026-06-19T06:45'), group: 'A' },
  { matchNumber: 53, home: 'CZE', away: 'MEX', matchDatetime: d('2026-06-25T06:45'), group: 'A' },
  { matchNumber: 54, home: 'RSA', away: 'KOR', matchDatetime: d('2026-06-25T06:45'), group: 'A' },

  // ─────────────────────────────────────────
  // GROUP B
  // ─────────────────────────────────────────
  { matchNumber: 3,  home: 'CAN', away: 'BIH', matchDatetime: d('2026-06-13T00:45'), group: 'B' },
  { matchNumber: 5,  home: 'QAT', away: 'SUI', matchDatetime: d('2026-06-14T00:45'), group: 'B' },
  { matchNumber: 26, home: 'SUI', away: 'BIH', matchDatetime: d('2026-06-19T00:45'), group: 'B' },
  { matchNumber: 27, home: 'CAN', away: 'QAT', matchDatetime: d('2026-06-19T03:45'), group: 'B' },
  { matchNumber: 49, home: 'BIH', away: 'QAT', matchDatetime: d('2026-06-25T00:45'), group: 'B' },
  { matchNumber: 50, home: 'SUI', away: 'CAN', matchDatetime: d('2026-06-25T00:45'), group: 'B' },

  // ─────────────────────────────────────────
  // GROUP C
  // ─────────────────────────────────────────
  { matchNumber: 6,  home: 'BRA', away: 'MAR', matchDatetime: d('2026-06-14T03:45'), group: 'C' },
  { matchNumber: 7,  home: 'HTI', away: 'SCT', matchDatetime: d('2026-06-14T06:45'), group: 'C' },
  { matchNumber: 30, home: 'SCT', away: 'MAR', matchDatetime: d('2026-06-20T03:45'), group: 'C' },
  { matchNumber: 31, home: 'BRA', away: 'HTI', matchDatetime: d('2026-06-20T06:15'), group: 'C' },
  { matchNumber: 51, home: 'MAR', away: 'HTI', matchDatetime: d('2026-06-25T03:45'), group: 'C' },
  { matchNumber: 52, home: 'SCT', away: 'BRA', matchDatetime: d('2026-06-25T03:45'), group: 'C' },

  // ─────────────────────────────────────────
  // GROUP D
  // ─────────────────────────────────────────
  { matchNumber: 4,  home: 'USA', away: 'PAR', matchDatetime: d('2026-06-13T06:45'), group: 'D' },
  { matchNumber: 8,  home: 'AUS', away: 'TUR', matchDatetime: d('2026-06-14T09:45'), group: 'D' },
  { matchNumber: 29, home: 'USA', away: 'AUS', matchDatetime: d('2026-06-20T00:45'), group: 'D' },
  { matchNumber: 32, home: 'TUR', away: 'PAR', matchDatetime: d('2026-06-20T08:45'), group: 'D' },
  { matchNumber: 59, home: 'PAR', away: 'AUS', matchDatetime: d('2026-06-26T07:45'), group: 'D' },
  { matchNumber: 60, home: 'TUR', away: 'USA', matchDatetime: d('2026-06-26T07:45'), group: 'D' },

  // ─────────────────────────────────────────
  // GROUP E
  // ─────────────────────────────────────────
  { matchNumber: 9, home: 'GER', away: 'CUR', matchDatetime: d('2026-06-14T22:45'), group: 'E' },
  { matchNumber: 11, home: 'CIV', away: 'ECU', matchDatetime: d('2026-06-15T04:45'), group: 'E' },
  { matchNumber: 34, home: 'GER', away: 'CIV', matchDatetime: d('2026-06-21T01:45'), group: 'E' },
  { matchNumber: 35, home: 'ECU', away: 'CUR', matchDatetime: d('2026-06-21T05:45'), group: 'E' },
  { matchNumber: 55,  home: 'CUR', away: 'CIV', matchDatetime: d('2026-06-26T01:45'), group: 'E' },
  { matchNumber: 56, home: 'ECU', away: 'GER', matchDatetime: d('2026-06-26T01:45'), group: 'E' },

  // ─────────────────────────────────────────
  // GROUP F
  // ─────────────────────────────────────────
  { matchNumber: 10, home: 'NED', away: 'JPN', matchDatetime: d('2026-06-15T01:45'), group: 'F' },
  { matchNumber: 12, home: 'SWE', away: 'TUN', matchDatetime: d('2026-06-15T07:45'), group: 'F' },
  { matchNumber: 33, home: 'NED', away: 'SWE', matchDatetime: d('2026-06-20T22:45'), group: 'F' },
  { matchNumber: 36, home: 'TUN', away: 'JPN', matchDatetime: d('2026-06-21T09:45'), group: 'F' },
  { matchNumber: 57, home: 'JPN', away: 'SWE', matchDatetime: d('2026-06-26T04:45'), group: 'F' },
  { matchNumber: 58, home: 'TUN', away: 'NED', matchDatetime: d('2026-06-26T04:45'), group: 'F' },

  // ─────────────────────────────────────────
  // GROUP G 
  // ─────────────────────────────────────────

  { matchNumber: 14, home: 'BEL', away: 'EGY',  matchDatetime: d('2026-06-16T00:45'), group: 'G',}, 
  { matchNumber: 16, home: 'IRN', away: 'NZL',  matchDatetime: d('2026-06-16T06:45'), group: 'G',}, 
  { matchNumber: 38, home: 'BEL', away: 'IRN',  matchDatetime: d('2026-06-22T00:45'), group: 'G',}, 
  { matchNumber: 40, home: 'NZL', away: 'EGY',  matchDatetime: d('2026-06-22T06:45'), group: 'G',}, 
  { matchNumber: 65, home: 'EGY', away: 'IRN',  matchDatetime: d('2026-06-27T08:45'), group: 'G',}, 
  { matchNumber: 66, home: 'NZL', away: 'BEL',  matchDatetime: d('2026-06-27T08:45'), group: 'G',}, 
 
 
 
  // ─────────────────────────────────────────
  // GROUP H
  // ─────────────────────────────────────────
  { matchNumber: 13,  home: 'ESP', away: 'CPV', matchDatetime: d('2026-06-15T21:45'), group: 'H' },
  { matchNumber: 15,  home: 'KSA', away: 'URU', matchDatetime: d('2026-06-16T03:45'), group: 'H' },
  { matchNumber: 37, home: 'ESP', away: 'KSA', matchDatetime: d('2026-06-21T21:45'), group: 'H' },
  { matchNumber: 39, home: 'URU', away: 'CPV', matchDatetime: d('2026-06-22T03:45'), group: 'H' },
  { matchNumber: 63, home: 'CPV', away: 'KSA', matchDatetime: d('2026-06-27T05:45'), group: 'H' },
  { matchNumber: 64, home: 'URU', away: 'ESP', matchDatetime: d('2026-06-27T05:45'), group: 'H' },

  // ─────────────────────────────────────────
  // GROUP I
  // ─────────────────────────────────────────
  { matchNumber: 17,  home: 'FRA', away: 'SEN', matchDatetime: d('2026-06-17T00:45'), group: 'I' },
  { matchNumber: 18,  home: 'IRQ', away: 'NOR', matchDatetime: d('2026-06-17T03:45'), group: 'I' },
  { matchNumber: 42, home: 'FRA', away: 'IRQ', matchDatetime: d('2026-06-23T02:45'), group: 'I' },
  { matchNumber: 43, home: 'NOR', away: 'SEN', matchDatetime: d('2026-06-23T05:45'), group: 'I' },
  { matchNumber: 61, home: 'NOR', away: 'FRA', matchDatetime: d('2026-06-27T00:45'), group: 'I' },
  { matchNumber: 62, home: 'SEN', away: 'IRQ', matchDatetime: d('2026-06-27T00:45'), group: 'I' },

  // ─────────────────────────────────────────
  // GROUP J
  // ─────────────────────────────────────────
  { matchNumber: 19, home: 'ARG', away: 'ALG', matchDatetime: d('2026-06-17T06:45'), group: 'J' },
  { matchNumber: 20, home: 'AUT', away: 'JOR', matchDatetime: d('2026-06-17T09:45'), group: 'J' },
  { matchNumber: 41, home: 'ARG', away: 'AUT', matchDatetime: d('2026-06-22T22:45'), group: 'J' },
  { matchNumber: 44, home: 'JOR', away: 'ALG', matchDatetime: d('2026-06-23T08:45'), group: 'J' },
  { matchNumber: 71,  home: 'ALG', away: 'AUT', matchDatetime: d('2026-06-28T07:45'), group: 'J' },
  { matchNumber: 72, home: 'JOR', away: 'ARG', matchDatetime: d('2026-06-28T07:45'), group: 'J' },

  // ─────────────────────────────────────────
  // GROUP K
  // ─────────────────────────────────────────
  { matchNumber: 21, home: 'POR', away: 'COD', matchDatetime: d('2026-06-17T22:45'), group: 'K' },
  { matchNumber: 24, home: 'UZB', away: 'COL', matchDatetime: d('2026-06-18T07:45'), group: 'K' },
  { matchNumber: 45, home: 'POR', away: 'UZB', matchDatetime: d('2026-06-23T22:45'), group: 'K' },
  { matchNumber: 48, home: 'COL', away: 'COD', matchDatetime: d('2026-06-24T07:45'), group: 'K' },
  { matchNumber: 69, home: 'COL', away: 'POR', matchDatetime: d('2026-06-28T05:15'), group: 'K' },
  { matchNumber: 70, home: 'COD', away: 'UZB', matchDatetime: d('2026-06-28T05:15'), group: 'K' },
  
  
  // ─────────────────────────────────────────
  // GROUP L
  // ─────────────────────────────────────────
  { matchNumber: 22, home: 'ENG', away: 'CRO', matchDatetime: d('2026-06-18T01:45'), group: 'L' },
  { matchNumber: 23, home: 'GHA', away: 'PAN', matchDatetime: d('2026-06-18T04:45'), group: 'L' },
  { matchNumber: 46, home: 'ENG', away: 'GHA', matchDatetime: d('2026-06-24T01:45'), group: 'L' },
  { matchNumber: 47, home: 'PAN', away: 'CRO', matchDatetime: d('2026-06-24T04:45'), group: 'L' },
  { matchNumber: 67, home: 'CRO', away: 'GHA', matchDatetime: d('2026-06-28T02:45'), group: 'L' },
  { matchNumber: 68, home: 'PAN', away: 'ENG', matchDatetime: d('2026-06-28T02:45'), group: 'L' },

  

];

// ─── Seed Function ────────────────────────────────────────────────────────────

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/predictator');
    console.log('✅ Connected to MongoDB');

   await Promise.all([
      Team.deleteMany({}),
      Fixture.deleteMany({}),
      GroupStanding.deleteMany({}),
      Prediction.deleteMany({}),

      User.updateMany(
        {},
        {
          $set: {
            totalPoints: 0,
            predictions: [],

            stats: {
              totalPredictions: 0,
              exactScores: 0,
              correctResults: 0,
              correctDraws: 0,
              totalMatches: 0,
            },
          },
        }
      ),
    ]);



    // Insert teams
    const teams = await Team.insertMany(WC_2026_TEAMS);
    console.log(`👕 Inserted ${teams.length} teams`);

    // Build code → _id lookup
    const teamMap = {};
    for (const team of teams) {
      teamMap[team.code] = team._id; //MEX: "abc123"
    }

    // Build fixtures — set predictionDeadline to 1hr before kickoff
    const fixturesDocs = GROUP_FIXTURES.map((f) => {
      const homeId = teamMap[f.home];
      const awayId = teamMap[f.away];

      if (!homeId) throw new Error(`Team code not found: ${f.home} (match #${f.matchNumber})`);
      if (!awayId) throw new Error(`Team code not found: ${f.away} (match #${f.matchNumber})`);

      return {
        homeTeam:          homeId,
        awayTeam:          awayId,
        country:           f.country,
        matchDatetime:     f.matchDatetime,
        predictionDeadline: new Date(f.matchDatetime.getTime() - 60 * 60 * 1000),
        stage:             'group_stage',
        group:             f.group,
        matchNumber:       f.matchNumber,
        status:            'upcoming',
      };
    });

    //Converting team codes into MongoDB objectIds and replacing home/away with homeTeam/awayTeam so the Fixture documents properly reference Team documents

    const createdFixtures = await Fixture.insertMany(fixturesDocs);
    console.log(`📅 Inserted ${createdFixtures.length} group stage fixtures`);

    // Create GroupStanding entries (one per team, all zeroes)
    const standingsDocs = teams.map((team) => ({
      group:   team.group,
      team:    team._id,
      played:  0,
      won:     0,
      drawn:   0,
      lost:    0,
      goalsFor:      0,
      goalsAgainst:  0,
      goalDifference: 0,
      points:  0,
      position: null,
      qualified: null,
    }));

    const createdStandings = await GroupStanding.insertMany(standingsDocs);
    console.log(`📊 Inserted ${createdStandings.length} group standing records`);

    console.log('\n✅ Seed complete!');
    console.log(`   Teams:     ${teams.length}`);
    console.log(`   Fixtures:  ${createdFixtures.length} (group stage)`);
    console.log(`   Standings: ${createdStandings.length}`);
    console.log('\n   Knockout fixtures will be generated by the admin panel');
    console.log('   after group stage is complete (Tools → Generate Knockout Bracket)');

      

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

seedDatabase();