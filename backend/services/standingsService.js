const Fixture = require('../models/Fixture');
const GroupStanding = require('../models/GroupStanding');
const Team = require('../models/Team');

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
  }
}