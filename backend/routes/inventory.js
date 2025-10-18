// backend/routes/inventory.js
import express from "express";
import { db } from "../db.js";

const router = express.Router();

/** Helper: Normalize fields before DB insert/update */
function normalizeItem(item) {
  const normalized = { ...item };
  const numericFields = [
    "quantity_on_hand",
    "minimum_stock_level",
    "unit_price",
    "lead_time_days",
    "weight_kg",
  ];

  numericFields.forEach((f) => {
    if (normalized[f] === "" || normalized[f] === undefined) normalized[f] = null;
    else normalized[f] = Number(normalized[f]);
  });

  // ✅ Convert empty date string to null
  if (!normalized.last_order_date || normalized.last_order_date === "")
    normalized.last_order_date = null;

  return normalized;
}

// ✅ Get all parts
router.get("/", async (req, res) => {
  try {
    const parts = await db("inventory").select("*").orderBy("part_id", "asc");
    res.json(parts);
  } catch (err) {
    console.error("Error fetching parts:", err);
    res.status(500).json({ success: 0, message: "Error fetching parts", error: err.message });
  }
});

// ✅ Add single part
router.post("/", async (req, res) => {
  try {
    const newItem = normalizeItem(req.body);
    const [newPart] = await db("inventory").insert(newItem).returning("*");
    res.json({ success: 1, data: newPart });
  } catch (err) {
    console.error("Error adding part:", err);
    res.status(500).json({
      success: 0,
      message: "Error adding part",
      error: err.message,
    });
  }
});

// ✅ Update part
router.put("/:id", async (req, res) => {
  try {
    const updatedItem = normalizeItem(req.body);
    const updated = await db("inventory")
      .where({ part_id: req.params.id })
      .update(updatedItem)
      .returning("*");
    res.json({ success: 1, data: updated });
  } catch (err) {
    console.error("Error updating part:", err);
    res.status(500).json({
      success: 0,
      message: "Error updating part",
      error: err.message,
    });
  }
});

// ✅ Bulk upload (handles duplicates too)
router.post("/bulk-upload", async (req, res) => {
  try {
    const { parts } = req.body;
    if (!Array.isArray(parts) || parts.length === 0)
      return res.status(400).json({ success: 0, message: "No parts provided" });

    const normalizedParts = parts.map(normalizeItem);
    const inserted = await db("inventory").insert(normalizedParts).returning("*");
    res.json({ success: 1, data: inserted });
  } catch (err) {
    if (err.code === "23505") {
      // duplicate part_number constraint
      return res.status(400).json({
        success: 0,
        message: "Duplicate part numbers found. Some records already exist.",
      });
    }
    console.error("Error bulk inserting inventory items:", err);
    res.status(500).json({
      success: 0,
      message: "Error bulk inserting inventory items",
      error: err.message,
    });
  }
});

// ✅ Delete part
router.delete("/:id", async (req, res) => {
  try {
    await db("inventory").where({ part_id: req.params.id }).del();
    res.json({ success: 1, message: "Part deleted successfully" });
  } catch (err) {
    console.error("Error deleting part:", err);
    res.status(500).json({
      success: 0,
      message: "Error deleting part",
      error: err.message,
    });
  }
});

export default router;
