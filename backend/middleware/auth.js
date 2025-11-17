const jwt = require("jsonwebtoken");
const { db } = require("../db");
require("dotenv").config();

/* ===========================================================
   AUTHENTICATE JWT + ATTACH PERMISSIONS
=========================================================== */
const authenticateJWT = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ message: "Missing token" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;  // {id, username, role, role_id, permissions}

    // Admin → superuser
    if (decoded.role === "admin") {
      req.user.permissions = ["*"];
      return next();
    }

    // Reload permissions for safety (optional, but secure)
    const rows = await db("role_permissions as rp")
      .join("permissions as p", "p.id", "rp.permission_id")
      .where("rp.role_id", decoded.role_id)
      .select("p.name");

    req.user.permissions = rows.map(r => r.name);

    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ===========================================================
   REQUIRE PERMISSION
=========================================================== */
const requirePermission = (permName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Admin bypass
    if (req.user.role === "admin" || req.user.permissions.includes("*")) {
      return next();
    }

    // Check required permission
    if (!req.user.permissions.includes(permName)) {
      return res.status(403).json({
        message: `Forbidden: missing permission "${permName}"`,
      });
    }

    next();
  };
};

module.exports = { authenticateJWT, requirePermission };
