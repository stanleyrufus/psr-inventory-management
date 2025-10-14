// backend/middleware/auth.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

// Middleware to authorize specific roles (e.g., admin)
const authorizeRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Access forbidden: insufficient privileges" });
    }
    next();
  };
};

module.exports = { authenticateJWT, authorizeRole };
