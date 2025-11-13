import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

const router = express.Router();

/* ===========================================================
 ✅ CREATE USER (correct route)
=========================================================== */
router.post("/", async (req, res) => {
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

    res.status(201).json(newUser);

  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ message: "Failed to create user", error: err.message });
  }
});

/* ===========================================================
 ✅ LOGIN
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

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ===========================================================
 ✅ GET USERS LIST
=========================================================== */
router.get("/", async (req, res) => {
  try {
    const users = await db("users")
      .select("id", "username", "email", "role", "created_at");
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
