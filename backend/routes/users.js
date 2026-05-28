const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/users/:id/profile
router.get('/:id/profile', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('username avatar totalPoints stats createdAt');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
}));

module.exports = router;