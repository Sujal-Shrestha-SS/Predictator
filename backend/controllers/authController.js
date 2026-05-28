const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

//Initializes Google OAuth Verifier
// Uses your Google Client ID from environment variables

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


//JWT Token Generator

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/auth/google
const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body; //credential = Google ID token sent from frontend (Google Sign-In)
  if (!credential) {
    return res.status(400).json({ error: 'Google credential required' });
  }

  // Verify Google token
  // Google verifies the token is real
  // Confirms it was issued for your app

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  // This contains user info from Google
  const payload = ticket.getPayload();

  // Extract user data
  const { sub: googleId, email, name, picture } = payload;

  // Check admin emails
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim());
  const role = adminEmails.includes(email) ? 'admin' : 'user';

  // Upsert user
  let user = await User.findOneAndUpdate(
    { googleId },
    {
      $set: {
        email,
        username: name,
        avatar: picture,
        role,
        lastLoginAt: new Date(),
      },
      $setOnInsert: {
        googleId,
        totalPoints: 0,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );


  // Create JWT Token - This is your app's login session token
  const token = generateToken(user._id);

  res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      totalPoints: user.totalPoints,
      role: user.role,
      stats: user.stats,
    },
  });
});

// GET /api/auth/me - get current user
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-__v'); //Fetch user from DB
  res.json({
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      totalPoints: user.totalPoints,
      role: user.role,
      stats: user.stats,
      accuracy: user.accuracy,
      createdAt: user.createdAt,
    },
  });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  // JWT is stateless; logout is handled client-side by deleting token
  res.json({ message: 'Logged out successfully' });
});

module.exports = { googleLogin, getMe, logout };