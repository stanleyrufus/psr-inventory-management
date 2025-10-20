// backend/routes/inventory.js
import express from "express";
import db from "../knex.js";

const router = express.Router();

/** Normalize data before DB insert/update */
function normalizeItem(item) {
  const numericFields = [
    "quantity_on_hand",
    "minimum_stock_level",
    "unit_price",
    "weight_kg",
    "lead_time_days",
  ];

  const normalized = { ...item };

  numericFields.forEach((field) => {
    if (normalized[field] === "" || normalized[field] === undefined) normalized[field] = null;
    else normalized[field] = Number(normalized[field]);
  });

  if (!normalized.last_order_date) normalized.last_order_date = null;

  return normalized;
}

// ✅ GET all inventory parts
router.get("/", async (req, res) => {
  try {
    const parts = await db("inventory").select("*").orderBy("part_id", "asc");
    res.json(parts);
  } catch (err) {
    console.error("Error fetching inventory:", err);
    res.status(500).json({ success: 0, message: "Error fetching inventory", error: err.message });
  }
});

// ✅ ADD new part
router.post("/", async (req, res) => {
  try {
    const newItem = normalizeItem(req.body);
    const [inserted] = await db("inventory").insert(newItem).returning("*");
    res.json({ success: 1, data: inserted });
  } catch (err) {
    console.error("Error adding inventory item:", err);
    res.status(500).json({
      success: 0,
      message: "Error adding inventory item",
      error: err.message,
    });
  }
});

// ✅ UPDATE part
router.put("/:id", async (req, res) => {
  try {
    const updatedItem = normalizeItem(req.body);
    const [updated] = await db("inventory")
      .where({ part_id: req.params.id })
      .update(updatedItem)
      .returning("*");

    res.json({ success: 1, data: updated });
  } catch (err) {
    console.error("Error updating inventory item:", err);
    res.status(500).json({
      success: 0,
      message: "Error updating inventory item",
      error: err.message,
    });
  }
});

// ✅ BULK upload
router.post("/bulk-upload", async (req, res) => {
  try {
    const { parts } = req.body;
    if (!Array.isArray(parts) || parts.length === 0)
      return res.status(400).json({ success: 0, message: "No parts provided" });

    const normalized = parts.map(normalizeItem);
    const inserted = await db("inventory").insert(normalized).returning("*");
    res.json({ success: 1, data: inserted });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({
        success: 0,
        message: "Duplicate part_number found. Some records already exist.",
      });
    }
    console.error("Error bulk inserting inventory:", err);
    res.status(500).json({
      success: 0,
      message: "Error bulk inserting inventory",
      error: err.message,
    });
  }
});

// ✅ DELETE part
router.delete("/:id", async (req, res) => {
  try {
    await db("inventory").where({ part_id: req.params.id }).del();
    res.json({ success: 1, message: "Part deleted successfully" });
  } catch (err) {
    console.error("Error deleting inventory item:", err);
    res.status(500).json({
      success: 0,
      message: "Error deleting inventory item",
      error: err.message,
    });
  }
});

export default router;
