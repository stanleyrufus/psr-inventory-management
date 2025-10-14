// /backend/middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate JWT from Authorization header
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization; // 'Bearer <token>'
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Invalid token format' });
  }

  const token = tokenParts[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid or expired token' });
    req.user = decoded; // Attach decoded token payload to req.user
    next();
  });
};

/**
 * Middleware to authorize a user role
 * Example usage: authorizeRole('admin')
 */
const authorizeRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
};

module.exports = { authenticateJWT, authorizeRole };
