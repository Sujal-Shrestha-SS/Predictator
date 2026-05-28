const Fixture = require('../models/Fixture');
const GroupStanding = require('../models/GroupStanding');
const Team = require('../models/Team');

// Recalculate group standings based on completed group stage fixtures

const recalculateGroupStandings = async () => {
  //Get all completed group stage fixtures

  const fixtures = await Fixture.find({
    stage: 'group_stage',
    status: 'completed',
    'result.homeScore': { $ne: null },
  }).populate('homeTeam awayTeam');
}


// Initialize standings map: { group: { teamId: stats } }

const standings = {};

for (const fixture of fixtures) {
  const { group, homeTeam, awayTeam, result } = fixture;

  if(!group) continue; //if fixture has no group, jump to the next fixture

  if(!standings[group]) standings[group] = {};

  //if team doesnt exist, create this object
  const initTeam = (team) => {
    if (!standings[group][team._id.toString()]) {
      standings[group][team._id.toString()] = {
        team: team._id,
        group, //shorthand for group: group
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
    }
  

  initTeam(homeTeam);
  initTeam(awayTeam);

  const homeStats = standings[group][homeTeam._id.toString()];
  const awayStats = standings[group][awayTeam._id.toString()];
  const { homeScore, awayScore } = result;

  homeStats.played++;
  awayStats.played++;
  homeStats.goalsFor += homeScore;
  homeStats.goalsAgainst += awayScore;
  awayStats.goalsFor += awayScore;
  awayStats.goalsAgainst += homeScore;

  if(homeScore > awayScore) {
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

  //Save to DB

  for (const group of Object.keys(standings)) { //extract group names only and turns objects into arrays
    const groupTeams = Object.values(standings[group]);

    // Sort: points > goal difference > goals For
    groupTeams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    })

    for (let i = 0; i < groupTeams.length; i++) {
      const teamStats = groupTeams[i];
      teamStats.position = i + 1;

      await GroupStanding.findOneAndUpdate(
        { group, team: teamStats.team },
        { $set: teamStats },
        { upsert: true, new: true} //upsert: true - If the document doesnt exist, create it
        // new: true - return the updated document, not the old one
      );
    }
  }
}


// Get standings for a specific group

const getGroupStandings = async (group) => {
  return GroupStanding.find({ group })
    .populate('team', 'name shortName logo flagUrl code')
    .sort({ points: -1, goalDifference: -1, goalsFor: -1});
}