const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  fixture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fixture',
    required: true,
    index: true,
  },
  homeScore: {
    type: Number,
    required: true,
    min: 0,
    max: 30,
  },
  awayScore: {
    type: Number,
    required: true,
    min: 0,
    max: 30,
  },
  points: {
    type: Number,
    default: null, // null = not yet calculated
  },
  pointType: {
    type: String,
    enum: ['exact', 'correct_result', 'correct_draw', 'incorrect', null],
    default: null,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  isCalculated: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
});

// Unique prediction per user per fixture
predictionSchema.index({ user: 1, fixture: 1 }, { unique: true });

module.exports = mongoose.model('Prediction', predictionSchema);