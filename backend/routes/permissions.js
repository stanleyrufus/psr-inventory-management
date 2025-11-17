import express from "express";
import { db } from "../db.js";
const router = express.Router();

/* -------- GET ALL PERMISSIONS -------- */
router.get("/", async (req, res) => {
  try {
    const permissions = await db("permissions").select("*");
    res.json({ data: permissions });
  } catch (e) {
    res.status(500).json({ message: "Failed to load permissions" });
  }
});

/* -------- GET PERMISSIONS FOR A ROLE -------- */
router.get("/role/:roleId", async (req, res) => {
  const { roleId } = req.params;
  try {
    const perms = await db("role_permissions")
      .where({ role_id: roleId })
      .pluck("permission_id");

    res.json({ permissions: perms });
  } catch {
    res.status(500).json({ message: "Failed to load role permissions" });
  }
});

/* -------- UPDATE ROLE PERMISSIONS -------- */
router.put("/role/:roleId", async (req, res) => {
  const { roleId } = req.params;
  const { permission_ids } = req.body;

  try {
    await db("role_permissions").where({ role_id: roleId }).del();

    if (Array.isArray(permission_ids) && permission_ids.length > 0) {
      const inserts = permission_ids.map((pid) => ({
        role_id: roleId,
        permission_id: pid,
      }));
      await db("role_permissions").insert(inserts);
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Failed to update permissions" });
  }
});

export default router;
