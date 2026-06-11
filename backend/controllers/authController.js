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
 let user = await User.findOne({ googleId });

if (!user) {
  user = await User.create({
    googleId,
    email,
    username: name,
    avatar: picture,
    role,
    totalPoints: 0,
    lastLoginAt: new Date(),
  });
} else {
  user.email = email;
  user.avatar = picture;
  user.lastLoginAt = new Date();

  // IMPORTANT:
  // Don't overwrite custom username
  await user.save();
}

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


const updateUsername = asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username?.trim()) {
    return res.status(400).json({
      error: 'Username is required',
    });
  }

  const trimmed = username.trim();

  if (trimmed.length < 3 || trimmed.length > 20) {
    return res.status(400).json({
      error: 'Username must be 3-20 characters',
    });
  }

  const existingUser = await User.findOne({
    username: trimmed,
    _id: { $ne: req.user._id },
  });

  if (existingUser) {
    return res.status(400).json({
      error: 'Username already taken',
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      username: trimmed,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.json({
    message: 'Username updated successfully',
    user: {
      id: user._id,
      username: user.username,
    },
  });
});


module.exports = {
  googleLogin,
  getMe,
  logout,
  updateUsername,
};