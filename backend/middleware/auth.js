import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { db } from "../db.js";

dotenv.config();

/* ===========================================================
   LOAD USER FROM JWT + ATTACH PERMISSIONS
=========================================================== */
async function loadUserFromToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = { ...decoded };

  // Admin shortcut
  if (String(decoded.role || "").toLowerCase() === "admin") {
    user.permissions = ["*"];
    return user;
  }

  const rows = await db("role_permissions as rp")
    .join("permissions as p", "p.id", "rp.permission_id")
    .where("rp.role_id", decoded.role_id)
    .select("p.name");

  user.permissions = rows.map((r) => r.name);

  return user;
}

/* ===========================================================
   AUTHENTICATE JWT + ATTACH PERMISSIONS
=========================================================== */
export const authenticateJWT = async (req, res, next) => {
  try {
    const user = await loadUserFromToken(req);

    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ===========================================================
   REQUIRE PERMISSION
=========================================================== */
export const requirePermission = (permName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        const user = await loadUserFromToken(req);
        if (!user) {
          return res.status(401).json({ message: "Not authenticated" });
        }
        req.user = user;
      }

      const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];

      if (
        String(req.user.role || "").toLowerCase() === "admin" ||
        perms.includes("*")
      ) {
        return next();
      }

      if (!perms.includes(permName)) {
        return res.status(403).json({
          message: `Forbidden: missing permission "${permName}"`,
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };
};

/* ===========================================================
   REQUIRE ADMIN
=========================================================== */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      const user = await loadUserFromToken(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      req.user = user;
    }

    const role = String(req.user.role || "").toLowerCase();
    if (role !== "admin") {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};