import express from "express";
import { db } from "../db.js";

const router = express.Router();

/* ✅ Get all roles */
router.get("/", async (req, res) => {
  try {
    const roles = await db("roles").select("*");
    res.json(roles);
  } catch (err) {
    console.error("Fetch roles error:", err);
    res.status(500).json({ message: "Failed to fetch roles" });
  }
});

/* ✅ Create role */
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: "Role name required" });

    const [role] = await db("roles")
      .insert({ name })
      .returning(["id", "name"]);

    res.json(role);
  } catch (err) {
    console.error("Create role error:", err);
    res.status(500).json({ message: "Failed to create role" });
  }
});

/* ✅ Delete role */
router.delete("/:id", async (req, res) => {
  try {
    await db("roles").where({ id: req.params.id }).delete();
    res.json({ message: "Role deleted" });
  } catch (err) {
    console.error("Delete role error:", err);
    res.status(500).json({ message: "Failed to delete role" });
  }
});

export default router;
