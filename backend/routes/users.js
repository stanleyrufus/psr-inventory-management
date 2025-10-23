// backend/routes/users.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

const router = express.Router();

// ✅ Register user
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "Username, email, and password are required" });

    const existing = await db("users").where({ username }).orWhere({ email }).first();
    if (existing)
      return res.status(400).json({ message: "Username or email already exists" });

    const hashed = bcrypt.hashSync(password, 10);

    const [newUser] = await db("users")
      .insert({ username, email, password: hashed, role: role || "user" })
      .returning(["id", "username", "email", "role"]);

    res.status(201).json({ message: "User registered successfully", user: newUser });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Login (username or email)
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "Username and password required" });

    // Try username OR email
    const user = await db("users")
      .where({ username })
      .orWhere({ email: username })
      .first();

    if (!user) {
      console.log("❌ Login failed: user not found for", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      console.log("❌ Login failed: wrong password for", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET)
      return res.status(500).json({ message: "Server misconfiguration: missing JWT_SECRET" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    const { password: _pw, ...userData } = user;
    res.json({ token, user: userData });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Get users list
router.get("/", async (req, res) => {
  try {
    const users = await db("users").select("id", "username", "email", "role");
    res.json(users);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
});

export default router;
