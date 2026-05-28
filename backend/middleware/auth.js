const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Step 1 — decode the JWT and attach req.user
const extractUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // no token — req.user stays undefined
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user) req.user = user;
    next();
  } catch (err) {
    // invalid or expired token — just continue without req.user
    next();
  }
};

// Step 2 — require a logged in user
const authenticate = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.user.isActive) {
    return res.status(401).json({ error: 'User inactive' });
  }
  next();
};

// Step 3 — require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const optionalAuth = (req, res, next) => next();

module.exports = { extractUser, authenticate, requireAdmin, optionalAuth };