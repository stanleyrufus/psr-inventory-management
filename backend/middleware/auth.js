import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { db } from "../db.js";

dotenv.config();

/* ===========================================================
   AUTHENTICATE JWT + ATTACH PERMISSIONS
=========================================================== */
export const authenticateJWT = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ message: "Missing token" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // {id, username, role, role_id, permissions}

    if (decoded.role === "admin") {
      req.user.permissions = ["*"];
      return next();
    }

    const rows = await db("role_permissions as rp")
      .join("permissions as p", "p.id", "rp.permission_id")
      .where("rp.role_id", decoded.role_id)
      .select("p.name");

    req.user.permissions = rows.map((r) => r.name);

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ===========================================================
   REQUIRE PERMISSION
=========================================================== */
export const requirePermission = (permName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user.role === "admin" || req.user.permissions.includes("*")) {
      return next();
    }

    if (!req.user.permissions.includes(permName)) {
      return res.status(403).json({
        message: `Forbidden: missing permission "${permName}"`,
      });
    }

    next();
  };
};

/* ===========================================================
   REQUIRE ADMIN
=========================================================== */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const role = String(req.user.role || "").toLowerCase();
  if (role !== "admin") {
    return res.status(403).json({ message: "Admin privileges required" });
  }

  next();
};