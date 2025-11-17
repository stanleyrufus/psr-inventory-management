// backend/routes/system_preferences.js
import express from "express";
import { db } from "../db.js";

const router = express.Router();

/* ---------------------------
   Get all system preferences
---------------------------- */
router.get("/", async (req, res) => {
  try {
    const rows = await db("system_settings").select("key", "value");
    const settings = {};

    rows.forEach(r => {
      settings[r.key] = r.value;
    });

    res.json(settings);
  } catch (err) {
    console.error("GET /system-preferences error:", err);
    res.status(500).json({ message: "Failed to load settings" });
  }
});

/* ---------------------------
   Save (update) system prefs
---------------------------- */
router.put("/", async (req, res) => {
  try {
    const updates = req.body;

    const keys = Object.keys(updates);
    for (const key of keys) {
      await db("system_settings")
        .update({ value: updates[key], updated_at: db.fn.now() })
        .where({ key });
    }

    res.json({ message: "Settings updated successfully" });
  } catch (err) {
    console.error("PUT /system-preferences error:", err);
    res.status(500).json({ message: "Failed to save settings" });
  }
});

export default router;
