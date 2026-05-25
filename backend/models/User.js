const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },

  avatar: {
    type: String,
    default: '',
  },

  totalPoints: {
    type: Number,
    default: 0,
    min: 0
  },

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },

  predictions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prediction'
  }],

  stats: {
    totalPredictions: { type: Number, default: 0},
    exactScores: { type: Number, default: 0},
    correctResults: { type: Number, default: 0},
    correctDraws: { type: Number, default: 0},
    totalMatches: { type: Number, default: 0},
  },

  lastLoginAt: {
    type: Date,
    default: Date.now,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});