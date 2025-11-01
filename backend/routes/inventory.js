// backend/routes/inventory.js
import express from "express";
import { db } from "../db.js";

const router = express.Router();

/**
 * ✅ Convert Excel serial date (e.g. 45106.6) to "YYYY-MM-DD"
 * Excel epoch starts 1899-12-30
 */
function excelSerialToISODate(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    if (!isNaN(Date.parse(trimmed))) {
      return new Date(trimmed).toISOString().split("T")[0];
    }
    return null;
  }

  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + value * 86400000);
    return jsDate.toISOString().split("T")[0];
  }

  return null;
}

function normalizeItem(item) {
  const normalized = { ...item };

  normalized.last_vendor_name =
    item.last_vendor_name || item.vendor_name || item.supplier_name || "";
  normalized.last_po_number = item.last_po_number || "";
  normalized.last_po_id = item.last_po_id || null;
  normalized.last_po_date = item.last_po_date ?? null;
  normalized.last_payment_terms = item.last_payment_terms || "";
  normalized.last_payment_method = item.last_payment_method || "";
  normalized.last_currency_code = item.last_currency_code || "USD";

  delete normalized.vendor_name;
  delete normalized.vendor_id;
  delete normalized.supplier_name;
  delete normalized.supplier_id;

  normalized.machine_name = normalized.machine_name || "";
  normalized.material = normalized.material || "";
  normalized.category = normalized.category || "";
  normalized.status = normalized.status || "Active";
  normalized.uom = normalized.uom || "";
  normalized.location = normalized.location || "";
  if (normalized.part_name === undefined) normalized.part_name = "";
  if (normalized.description === undefined) normalized.description = "";
  delete normalized.last_order_date;

  return normalized;
}

function sanitizeInventoryRecord(recIn) {
  const rec = { ...recIn };

  const intFields = [
    "quantity_on_hand",
    "minimum_stock_level",
    "lead_time_days",
    "last_po_id",
    "last_vendor_id",
  ];

  const numericFields = [
    "current_unit_price",
    "weight_kg",
    "last_quantity",
    "last_unit_price",
    "last_freight",
  ];

  intFields.forEach((field) => {
    if (rec[field] === "" || rec[field] === undefined || rec[field] === null) {
      rec[field] = null;
    } else {
      const parsed = parseInt(rec[field], 10);
      rec[field] = isNaN(parsed) ? null : parsed;
    }
  });

  numericFields.forEach((field) => {
    if (rec[field] === "" || rec[field] === undefined || rec[field] === null) {
      rec[field] = null;
    } else {
      const parsed = parseFloat(rec[field]);
      rec[field] = isNaN(parsed) ? null : parsed;
    }
  });

  if (rec.last_po_date !== undefined) {
    rec.last_po_date = excelSerialToISODate(rec.last_po_date);
  }

  return rec;
}

/** ✅ GET all inventory parts */
router.get("/", async (req, res) => {
  try {
    const parts = await db("inventory").select("*").orderBy("part_id", "asc");
    res.json(parts);
  } catch (err) {
    console.error("❌ Error fetching inventory:", err);
    res.status(500).json({
      success: 0,
      message: "Error fetching inventory",
      error: err.message,
    });
  }
});

/** ✅ ADD new part with duplicate check */
router.post("/", async (req, res) => {
  try {
    // we require part_number at minimum when adding inline from PO
    if (
      !req.body.part_number ||
      String(req.body.part_number).trim() === ""
    ) {
      return res.status(400).json({
        success: 0,
        message: "part_number is required",
      });
    }

    const newItemNorm = normalizeItem(req.body);
    const newItem = sanitizeInventoryRecord(newItemNorm);

    const existing = await db("inventory")
      .where({ part_number: newItem.part_number })
      .first();
    if (existing) {
      return res.status(400).json({
        success: 0,
        message: `Duplicate part number "${newItem.part_number}" already exists.`,
      });
    }

    const [inserted] = await db("inventory").insert(newItem).returning("*");
    res.json({
      success: 1,
      data: inserted,
      message: "Part added successfully",
    });
  } catch (err) {
    console.error("❌ Error adding inventory item:", err);
    res.status(500).json({
      success: 0,
      message: "Error adding inventory item",
      error: err.message,
    });
  }
});

/** ✅ BULK upload parts (CSV/Excel) — skip duplicates gracefully */
router.post("/bulk-upload", async (req, res) => {
  try {
    const parts = req.body.parts || req.body;
    if (!Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({
        success: 0,
        message: "No parts provided for bulk upload",
      });
    }

    const normalized = parts.map((p) => normalizeItem(p));
    const sanitized = normalized.map((p) => sanitizeInventoryRecord(p));

    const allowedColumns = await db("information_schema.columns")
      .select("column_name")
      .where({ table_name: "inventory" })
      .then((rows) => rows.map((r) => r.column_name));

    const cleaned = sanitized.map((obj) =>
      Object.fromEntries(
        Object.entries(obj).filter(([key]) =>
          allowedColumns.includes(key)
        )
      )
    );

    const inserted = [];
    const duplicates = [];

    for (const p of cleaned) {
      try {
        if (!p.part_number || p.part_number === "") {
          console.error("⚠️ Skipping row with no part_number");
          continue;
        }
        const exists = await db("inventory")
          .where({ part_number: p.part_number })
          .first();

        if (exists) {
          duplicates.push(p.part_number);
          continue;
        }

        const [added] = await db("inventory").insert(p).returning("*");
        inserted.push(added);
      } catch (e) {
        console.error(`❌ Insert error for ${p.part_number}:`, e.message);
      }
    }

    let message;
    if (inserted.length && duplicates.length) {
      message = `✅ Inserted ${inserted.length} part(s). ⚠️ Skipped ${duplicates.length} duplicate(s): ${duplicates.join(
        ", "
      )}`;
    } else if (duplicates.length && !inserted.length) {
      message = `⚠️ Skipped ${duplicates.length} duplicate(s): ${duplicates.join(
        ", "
      )}`;
    } else {
      message = `✅ Inserted ${inserted.length} part(s).`;
    }

    res.json({ success: 1, inserted, duplicates, message });
  } catch (err) {
    console.error("❌ Error in bulk upload:", err.message);
    res.status(500).json({
      success: 0,
      message: "Error bulk inserting inventory items",
      error: err.message,
    });
  }
});

/** ✅ DELETE part */
router.delete("/:id", async (req, res) => {
  try {
    await db("inventory").where({ part_id: req.params.id }).del();
    res.json({ success: 1, message: "Part deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting inventory item:", err);
    res.status(500).json({
      success: 0,
      message: "Error deleting inventory item",
      error: err.message,
    });
  }
});

/** ✅ UPDATE part (PUT /api/parts/:id) */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedNorm = normalizeItem(req.body);
    const updated = sanitizeInventoryRecord(updatedNorm);

    const result = await db("inventory")
      .where({ part_id: id })
      .update(updated)
      .returning("*");

    if (!result || result.length === 0) {
      return res
        .status(404)
        .json({ success: 0, message: "Part not found" });
    }

    res.json({
      success: 1,
      data: result[0],
      message: "Part updated successfully",
    });
  } catch (err) {
    console.error("❌ Error updating inventory item:", err);
    res.status(500).json({
      success: 0,
      message: "Error updating inventory item",
      error: err.message,
    });
  }
});

export default router;
