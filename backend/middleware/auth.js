// backend/middleware/auth.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

// TEMP DEV: bypass JWT
const authenticateJWT = (req, res, next) => {
  req.user = { id: 1, username: "dev", role: "admin" };
  next();
};

const authorizeRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Access forbidden: insufficient privileges" });
    }
    next();
  };
};

module.exports = { authenticateJWT, authorizeRole };
