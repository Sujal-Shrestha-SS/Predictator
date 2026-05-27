
const authenticate = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isActive) {
    return res.status(401).json({ error: 'User inactive' });
  }

  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const optionalAuth = (req, res, next) => {
  // do nothing, req.user may or may not exist
  next();
};

module.exports = { authenticate, requireAdmin, optionalAuth };