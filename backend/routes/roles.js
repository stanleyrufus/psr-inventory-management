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
const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Role name required" });

    const [role] = await db("roles")
      .insert({ name, description  })
      .returning(["id", "name"]);

    res.json(role);
  } catch (err) {
    console.error("Create role error:", err);
    res.status(500).json({ message: "Failed to create role" });
  }
});
router.post("/roles", async (req, res) => {
  const { name, description } = req.body;

  try {
    const [role] = await db("roles")
      .insert({ name, description })
      .returning("*");

    res.json(role);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/roles/:id", async (req, res) => {
  const { name, description } = req.body;

  try {
    const [role] = await db("roles")
      .where({ id: req.params.id })
      .update({ name, description })
      .returning("*");

    res.json(role);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// PUT /roles/:id - update role
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    await db("roles")
      .where({ id })
      .update({
        name,
        description,
        updated_at: db.fn.now()
      });

    res.json({ success: true });
  } catch (err) {
    console.error("Role update failed:", err);
    res.status(500).json({ message: "Failed to update role" });
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
