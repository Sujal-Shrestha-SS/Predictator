const mongoose = require('mongoose');
const crypto = require('crypto');

const leagueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
  },

  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true,
  },

  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

// Generate a random 8-character alphanumeric code
leagueSchema.statics.generateCode = function () {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F7C12B"
};

// Ensure creator is always in members list
leagueSchema.pre('save', function (next) {
  const creatorStr = this.creator.toString();
  const alreadyMember = this.members.some((m) => m.toString() === creatorStr);
  if (!alreadyMember) {
    this.members.push(this.creator);
  }
  
});

module.exports = mongoose.model('League', leagueSchema);
