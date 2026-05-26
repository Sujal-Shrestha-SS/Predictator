const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  apiId: {
    type: Number,
    unique: true,
    sparse: true, // Allow null for manually added teams
  },

  name: {
    type: String,
    required: true,
    trim: true,
  },

  shortName: {
    type: String,
    trim: true,
    maxlength: 10,
  },

  code: {
    type: String,
    trim: true,
    maxLength: 5,
    uppercase: true,
  },

  logo: {
    type: String,
    default: '',
  },

  flagUrl: {
    type: String,
    default: '',
  },

  country: {
    type: String,
    trim: true,
  },

  confederation: {
    type: String,
    enum: ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'],
  },

  group: {
    type: String,
    trim: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

}, {
  timestamps: true,
});


teamSchema.index({ name: 1 });

module.exports = mongoose.model('Team', teamSchema);