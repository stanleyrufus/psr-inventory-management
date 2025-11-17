// backend/routes/users.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

const router = express.Router();

/* -------------------------------------------------------
   Helper: load permissions for a given role name
   - admin => all permissions
   - other roles => permissions from role_permissions
------------------------------------------------------- */
async function getPermissionsForRoleName(roleName) {
  if (!roleName) return [];

  try {
    // Admin: treat as superuser → all permissions
    if (roleName.toLowerCase() === "admin") {
      const all = await db("permissions").select("name");
      return all.map((p) => p.name);
    }

    // Non-admin: look up role row
    const roleRow = await db("roles")
      .whereRaw("LOWER(name) = LOWER(?)", [roleName])
      .first();

    if (!roleRow) return [];

    const rows = await db("role_permissions")
      .join("permissions", "role_permissions.permission_id", "permissions.id")
      .where("role_permissions.role_id", roleRow.id)
      .select("permissions.name");

    return rows.map((r) => r.name);
  } catch (err) {
    console.error("Permission load failed:", err);
    return [];
  }
}

/* ===========================================================
   ✅ CREATE USER (shared handler)
=========================================================== */
async function createUser(req, res) {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await db("users")
      .where({ username })
      .orWhere({ email })
      .first();

    if (existing) {
      return res.status(400).json({ message: "Username or email already exists" });
    }

    const hashed = bcrypt.hashSync(password, 10);

    const [newUser] = await db("users")
      .insert({ username, email, password: hashed, role })
      .returning(["id", "username", "email", "role", "created_at"]);

    // Optionally preload permissions if you want, but not required here
    res.status(201).json({
      message: "User created successfully",
      user: { ...newUser, permissions: [] },
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ message: "Failed to create user", error: err.message });
  }
}

// ✅ Expose under BOTH "/" and "/register" to avoid 404
router.post("/", createUser);
router.post("/register", createUser);

/* ===========================================================
   LOGIN — now returns permissions array + role_id
=========================================================== */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await db("users")
      .where({ username })
      .orWhere({ email: username })
      .first();

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    /* -----------------------------------------------------
       1️⃣ Load the role ID and permissions for this user
    ------------------------------------------------------*/
    const roleRow = await db("roles").where({ name: user.role }).first();
    const roleId = roleRow?.id;

    let permissions = [];

    if (user.role === "admin") {
      permissions = ["*"];   // superuser
    } else {
      const rows = await db("role_permissions as rp")
        .join("permissions as p", "p.id", "rp.permission_id")
        .where("rp.role_id", roleId)
        .select("p.name");

      permissions = rows.map(r => r.name);
    }

    /* -----------------------------------------------------
       2️⃣ Build JWT payload
    ------------------------------------------------------*/
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      role_id: roleId,
      permissions,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    /* -----------------------------------------------------
       3️⃣ Return clean user object (no password)
    ------------------------------------------------------*/
    const { password: _pw, ...safeUser } = user;

    res.json({
      token,
      user: {
        ...safeUser,
        role_id: roleId,
        permissions,
      },
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ===========================================================
   ✅ GET USERS LIST
=========================================================== */
router.get("/", async (req, res) => {
  try {
    const users = await db("users").select(
      "id",
      "username",
      "email",
      "role",
      "created_at"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

/* ===========================================================
   ✅ UPDATE USER
=========================================================== */
router.put("/:id", async (req, res) => {
  try {
    const { username, email, role, password } = req.body;

    const updateData = { username, email, role };
    if (password && password.trim() !== "") {
      updateData.password = bcrypt.hashSync(password, 10);
    }

    const [updated] = await db("users")
      .where({ id: req.params.id })
      .update(updateData)
      .returning(["id", "username", "email", "role"]);

    res.json({ message: "User updated", user: updated });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

/* ===========================================================
   ✅ DELETE USER
=========================================================== */
router.delete("/:id", async (req, res) => {
  try {
    await db("users").where({ id: req.params.id }).delete();
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

/* ===========================================================
   ✅ RESET PASSWORD
=========================================================== */
router.patch("/:id/reset-password", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password required" });
    }

    const hashed = bcrypt.hashSync(password, 10);

    await db("users")
      .where({ id: req.params.id })
      .update({ password: hashed });

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

export default router;
