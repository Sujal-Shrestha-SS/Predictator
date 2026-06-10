const Fixture = require('../models/Fixture');
const GroupStanding = require('../models/GroupStanding');
const Team = require('../models/Team');

// Recalculate group standings
const recalculateGroupStandings = async () => {
  const fixtures = await Fixture.find({
    stage: 'group_stage',
    status: 'completed',
    'result.homeScore': { $ne: null },
  }).populate('homeTeam awayTeam');

  const standings = {};

  const initTeam = (group, team) => {
    if (!standings[group][team._id.toString()]) {
      standings[group][team._id.toString()] = {
        team: team._id,
        group,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        position: null,
        qualified: null,   // ← this was missing, causing the enum validation crash
      };
    }
  };

  for (const fixture of fixtures) {
    const { group, homeTeam, awayTeam, result } = fixture;

    if (!group || !homeTeam || !awayTeam) continue;  // ← guard against null teams

    if (!standings[group]) standings[group] = {};

    initTeam(group, homeTeam);
    initTeam(group, awayTeam);

    const homeStats = standings[group][homeTeam._id.toString()];
    const awayStats = standings[group][awayTeam._id.toString()];
    const { homeScore, awayScore } = result;

    homeStats.played++;
    awayStats.played++;

    homeStats.goalsFor += homeScore;
    homeStats.goalsAgainst += awayScore;
    awayStats.goalsFor += awayScore;
    awayStats.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      homeStats.won++;
      homeStats.points += 3;
      awayStats.lost++;
    } else if (homeScore < awayScore) {
      awayStats.won++;
      awayStats.points += 3;
      homeStats.lost++;
    } else {
      homeStats.drawn++;
      awayStats.drawn++;
      homeStats.points++;
      awayStats.points++;
    }

    homeStats.goalDifference = homeStats.goalsFor - homeStats.goalsAgainst;
    awayStats.goalDifference = awayStats.goalsFor - awayStats.goalsAgainst;
  }

  for (const group of Object.keys(standings)) {
    const groupTeams = Object.values(standings[group]);

    groupTeams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    for (let i = 0; i < groupTeams.length; i++) {
      groupTeams[i].position = i + 1;
      await GroupStanding.findOneAndUpdate(
        { group, team: groupTeams[i].team },
        { $set: groupTeams[i] },
        { upsert: true, new: true }
      );
    }
  }
};

// Get group standings
const getGroupStandings = async (group) => {
  return GroupStanding.find({ group })
    .populate('team', 'name shortName logo flagUrl code')
    .sort({ points: -1, goalDifference: -1, goalsFor: -1 });
};

// Get all standings
const getAllGroupStandings = async () => {
  const standings = await GroupStanding.find()
    .populate('team', 'name shortName logo flagUrl code')
    .sort({ group: 1, points: -1, goalDifference: -1, goalsFor: -1 });

  return standings.reduce((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});
};

// Get best 8 third-placed teams
const getBestThirdPlacedTeams = async () => {
  return GroupStanding.find({
    position: 3
  })
    .populate('team', 'name shortName logo flagUrl code')
    .sort({
      points: -1,
      goalDifference: -1,
      goalsFor: -1
    })
    .limit(8);
};


module.exports = {
  recalculateGroupStandings,
  getGroupStandings,
  getAllGroupStandings,
  getBestThirdPlacedTeams,
};