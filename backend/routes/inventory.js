import express from "express";
import { db } from "../db.js";

const router = express.Router();

/**
 * ✅ Convert Excel serial date (e.g. 45106.6) to "YYYY-MM-DD"
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

/** ----------------------------------------
 *  ✅ Normalization helpers
 *------------------------------------------ */
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
    if (!rec[field] && rec[field] !== 0) rec[field] = null;
    else rec[field] = parseInt(rec[field], 10) || null;
  });

  numericFields.forEach((field) => {
    if (!rec[field] && rec[field] !== 0) rec[field] = null;
    else rec[field] = parseFloat(rec[field]) || null;
  });

  if (rec.last_po_date !== undefined) {
    rec.last_po_date = excelSerialToISODate(rec.last_po_date);
  }

  return rec;
}

/** ----------------------------------------
 * ✅ Dashboard endpoints FIRST
 *------------------------------------------ */

// Total parts
router.get("/count", async (_, res) => {
  const r = await db("inventory").count("part_id as count").first();
  res.json({ count: Number(r.count) });
});

// Low-stock count
router.get("/low-stock/count", async (_, res) => {
  const r = await db("inventory")
    .whereNotNull("minimum_stock_level")
    .andWhere("quantity_on_hand", "<=", db.ref("minimum_stock_level"))
    .count("part_id as count")
    .first();
  res.json({ count: Number(r.count) });
});

// Low-stock preview
router.get("/low-stock", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "10"), 100);
    const rows = await db("inventory")
      .select("part_id", "part_number", "part_name", "quantity_on_hand", "minimum_stock_level", "location")
      .whereNotNull("minimum_stock_level")
      .andWhere("quantity_on_hand", "<=", db.ref("minimum_stock_level"))
      .orderBy([{ column: "quantity_on_hand", order: "asc" }, { column: "part_number", order: "asc" }])
      .limit(limit);

    res.json({ success: 1, data: rows });
  } catch (err) {
    res.status(500).json({ success: 0, errormsg: "Failed to fetch low stock" });
  }
});

// Monthly inventory trend
router.get("/trend/monthly", async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months || "6"), 24);

    const rows = await db("purchase_order_items as i")
      .leftJoin("purchase_orders as po", "i.po_id", "po.id")
      .whereNotNull("po.order_date")
      .select(
        db.raw(`to_char(date_trunc('month', po.order_date), 'YYYY-MM') as ym`),
        db.raw("COALESCE(SUM(i.quantity), 0)::int as count")
      )
      .groupByRaw("date_trunc('month', po.order_date)")
      .orderByRaw("date_trunc('month', po.order_date) desc")
      .limit(months);

    res.json({ success: 1, data: rows.reverse() });
  } catch (err) {
    res.status(500).json({ success: 0, errormsg: "Trend fetch error" });
  }
});

/** ----------------------------------------
 * ✅ CRUD routes AFTER dashboard routes
 *------------------------------------------ */

// Get all parts
router.get("/", async (_, res) => {
  const parts = await db("inventory").select("*").orderBy("part_id", "asc");
  res.json(parts);
});

// Add part
router.post("/", async (req, res) => {
  try {
    if (!req.body.part_number) {
      return res.status(400).json({ success: 0, message: "part_number required" });
    }

    const exists = await db("inventory").where({ part_number: req.body.part_number }).first();
    if (exists) {
      return res.status(400).json({ success: 0, message: "Duplicate part_number" });
    }

    const item = sanitizeInventoryRecord(normalizeItem(req.body));
    const [inserted] = await db("inventory").insert(item).returning("*");
    res.json({ success: 1, data: inserted, message: "Part added" });
  } catch {
    res.status(500).json({ success: 0, message: "Insert error" });
  }
});

// Update part
router.put("/:id", async (req, res) => {
  try {
    const item = sanitizeInventoryRecord(normalizeItem(req.body));
    const result = await db("inventory").where({ part_id: req.params.id }).update(item).returning("*");

    if (!result.length) return res.status(404).json({ success: 0, message: "Not found" });
    res.json({ success: 1, data: result[0], message: "Updated" });
  } catch {
    res.status(500).json({ success: 0, message: "Update failed" });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  await db("inventory").where({ part_id: req.params.id }).del();
  res.json({ success: 1, message: "Deleted" });
});

export default router;
