const mongoose = require('mongoose');

const fixtureSchema = new mongoose.Schema({
  apiId: {
    type: Number,
    unique: true,
    sparse: true,
  },
  homeTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  awayTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  matchDatetime: {
    type: Date,
    required: true,
    index: true,
  },
  predictionDeadline: {
    type: Date, // 1 hour before kickoff
  },
  stage: {
    type: String,
    enum: [
      'group_stage',
      'round_of_32',
      'round_of_16',
      'quarterfinal',
      'semifinal',
      'third_place',
      'final',
    ],
    required: true,
    index: true,
  },
  group: {
    type: String,
    trim: true, // e.g., "A", "B", etc.
  },
  matchNumber: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['upcoming','completed'],
    default: 'upcoming',
    index: true,
  },
  result: {
    homeScore: { type: Number, default: null },
    awayScore: { type: Number, default: null },
    winner: {
      type: String,
      enum: ['home', 'away', 'draw', null],
      default: null,
    },
    extraTime: { type: Boolean, default: false },
    penalties: { type: Boolean, default: false },
    penaltyHomeScore: { type: Number, default: null },
    penaltyAwayScore: { type: Number, default: null },
  },
  scoresCalculated: {
    type: Boolean,
    default: false,
  },
  lastSyncedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Set prediction deadline before saving
fixtureSchema.pre('save', function (next) {
  if (this.matchDatetime && !this.predictionDeadline) {
    this.predictionDeadline = new Date(this.matchDatetime.getTime() - 60 * 60 * 1000);
  }
  next();
});

// Virtual: is prediction open
fixtureSchema.virtual('isPredictionOpen').get(function () {
  return this.status === 'upcoming' && new Date() < this.predictionDeadline;
});

fixtureSchema.set('toJSON', { virtuals: true });
fixtureSchema.set('toObject', { virtuals: true });

fixtureSchema.index({ matchDatetime: 1, stage: 1 });
fixtureSchema.index({ homeTeam: 1, awayTeam: 1 });

module.exports = mongoose.model('Fixture', fixtureSchema);