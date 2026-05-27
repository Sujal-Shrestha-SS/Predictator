const mongoose = require('mongoose');

const groupStandingSchema = new mongoose.Schema({
  group: {
    type: String,
    required: true,
    trim: true,
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  played: { type: Number, default: 0 },
  won: { type: Number, default: 0 },
  drawn: { type: Number, default: 0 },
  lost: { type: Number, default: 0 },
  goalsFor: { type: Number, default: 0 },
  goalsAgainst: { type: Number, default: 0 },
  goalDifference: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  qualified: {
    type: String,
    enum: ['round_of_32', 'eliminated', null],
    default: null,
  },
  position: { type: Number, default: null },
}, {
  timestamps: true,
});

groupStandingSchema.index({ group: 1, points: -1, goalDifference: -1, goalsFor: -1 });
groupStandingSchema.index({ group: 1, team: 1 }, { unique: true });

module.exports = mongoose.model('GroupStanding', groupStandingSchema);