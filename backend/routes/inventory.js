// backend/routes/inventory.js

import express from "express";
import { db } from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { makeUploader, resolveUploadPath } from "../middleware/uploads.js";


const router = express.Router();
const upload = makeUploader("parts"); // images for parts go into /uploads/parts


/* ========================================================
   DASHBOARD-RELATED ROUTES  (MUST BE BEFORE "/:id")
   /api/parts/count
   /api/parts/low-stock/count
   /api/parts/low-stock
   /api/parts/trend/monthly
======================================================== */

// Total parts count
router.get("/count", async (req, res) => {
  try {
    const [{ count }] = await db("inventory").count("* as count");
    res.json({ count: Number(count) });
  } catch (err) {
    console.error("❌ parts/count error:", err);
    res.status(500).json({ message: "Failed to fetch parts count" });
  }
});

// Low stock count
router.get("/low-stock/count", async (req, res) => {
  try {
    const [{ count }] = await db("inventory")
      .whereRaw('"quantity_on_hand" < "minimum_stock_level"')
      .count("* as count");

    res.json({ count: Number(count) });
  } catch (err) {
    console.error("❌ low-stock/count error:", err);
    res.status(500).json({ message: "Failed to fetch low stock count" });
  }
});

// Low stock list
router.get("/low-stock", async (req, res) => {
  const limit = Number(req.query.limit) || 10;

  try {
    const rows = await db("inventory")
      .whereRaw('"quantity_on_hand" < "minimum_stock_level"')
      .orderBy("quantity_on_hand", "asc")
      .limit(limit);

    res.json({ data: rows });
  } catch (err) {
    console.error("❌ low-stock error:", err);
    res.status(500).json({ message: "Failed to fetch low stock list" });
  }
});

// Inventory trend by month
router.get("/trend/monthly", async (req, res) => {
  const months = Number(req.query.months) || 6;

  try {
    const rows = await db.raw(`
      SELECT 
        to_char(date_trunc('month', created_on), 'YYYY-MM') AS ym,
        COUNT(*) 
      FROM inventory
      WHERE created_on >= NOW() - interval '${months} months'
      GROUP BY ym
      ORDER BY ym ASC
    `);

    res.json({ data: rows.rows });
  } catch (err) {
    console.error("❌ trend/monthly error:", err);
    res.status(500).json({ message: "Failed to fetch parts trend" });
  }
});

/* --------------------------------------------------------
   GET ALL PARTS  ->  GET /api/parts
---------------------------------------------------------*/
router.get("/", async (req, res) => {
  try {
    const rows = await db("inventory")
      .select(
        "part_id",
        "part_number",
        "part_name",
        "category",
        "description",
        "uom",
        "quantity_on_hand",
        "minimum_stock_level",
        "current_unit_price",
        "last_unit_price",
        "location",
        "status",
        "lead_time_days",
        "weight_kg",
        "material",
        "remarks",
        "machine_name",
        "last_po_number",
        "last_po_id",
        "last_po_date",
        "last_vendor_id",
        "last_vendor_name",
        "last_quantity",
        "last_currency_code",
        "last_freight",
        "last_payment_terms",
        "last_payment_method",
        "image_url",
        "created_on",
        "updated_on"
      )
      .orderBy("part_id", "desc");

    res.json({ success: 1, data: rows });
  } catch (err) {
    console.error("❌ GET /api/parts error:", err);
    res.status(500).json({ success: 0, message: "Failed to fetch parts" });
  }
});

/* --------------------------------------------------------
   GET SINGLE PART  ->  GET /api/parts/:id
   ⚠️ THIS MUST COME AFTER ALL THE /xxx ROUTES ABOVE
---------------------------------------------------------*/
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const row = await db("inventory").where({ part_id: id }).first();

    if (!row) {
      return res.status(404).json({ success: 0, message: "Part not found" });
    }

    res.json({ success: 1, data: row });
  } catch (err) {
    console.error("❌ GET /api/parts/:id error:", err);
    res.status(500).json({ success: 0, message: "Failed to fetch part" });
  }
});

// CREATE PART  (multipart + image upload support)
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const body = req.body;

    const insertData = {
      part_number: body.part_number,
      part_name: body.part_name,
      category: body.category || "",
      description: body.description || "",
      uom: body.uom || "",
      quantity_on_hand: Number(body.quantity_on_hand) || 0,
      minimum_stock_level: Number(body.minimum_stock_level) || 0,
      current_unit_price: Number(body.current_unit_price) || 0,
      weight_kg: body.weight_kg ? Number(body.weight_kg) : null,
      lead_time_days: body.lead_time_days ? Number(body.lead_time_days) : null,
      location: body.location || "",
      status: body.status || "Active",
      material: body.material || "",
      remarks: body.remarks || "",
      machine_name: body.machine_name || "",
      last_po_date: body.last_po_date || null,
      updated_on: db.fn.now(),
    };

    // ⭐ If image uploaded
    if (req.file) {
      insertData.image_url = `/uploads/parts/${req.file.filename}`;
    }

    const inserted = await db("inventory")
      .insert(insertData)
      .returning(["part_id"]);

    res.json({ success: 1, data: inserted[0] });
  } catch (err) {
    console.error("❌ CREATE part error:", err);

    // UNIQUE violation → part number exists
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ success: 0, message: "Part number already exists" });
    }

    res.status(500).json({ success: 0, message: "Failed to add part" });
  }
});

router.put("/:id", upload.single("image"), async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body;

  try {
    const exists = await db("inventory").where({ part_id: id }).first();
    if (!exists) {
      return res.status(404).json({ success: 0, message: "Part not found" });
    }

    const num = (v) =>
      v === "" || v === null || v === undefined ? null : Number(v);

    const updateData = {
      part_number: body.part_number || exists.part_number,
      part_name: body.part_name || exists.part_name,
      category: body.category ?? exists.category,
      description: body.description ?? exists.description,
      uom: body.uom ?? exists.uom,

      quantity_on_hand: num(body.quantity_on_hand),
      minimum_stock_level: num(body.minimum_stock_level),
      current_unit_price: num(body.current_unit_price),
      lead_time_days: num(body.lead_time_days),
      weight_kg: num(body.weight_kg),

      location: body.location ?? exists.location,
      status: body.status ?? exists.status,
      material: body.material ?? exists.material,
      last_po_date: body.last_po_date || null,
      remarks: body.remarks ?? exists.remarks,
      updated_on: db.fn.now(),
    };

    if (req.file) {
      const newUrl = `/uploads/parts/${req.file.filename}`;
      updateData.image_url = newUrl;

      if (exists.image_url) {
        const oldFile = exists.image_url.replace(/^\//, "");
        const oldPath = path.join(process.cwd(), oldFile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    await db("inventory").where({ part_id: id }).update(updateData);

    res.json({
      success: 1,
      message: "Part updated successfully",
      image_updated: !!req.file,
    });
  } catch (err) {
    console.error("❌ PUT /api/parts/:id error:", err);

    // 🔥 UNIQUE CONSTRAINT DUPLICATE FIX
    if (err.code === "23505") {
      return res.status(400).json({
        success: 0,
        message: "Part number already exists",
      });
    }

    res.status(500).json({ success: 0, message: "Failed to update part" });
  }
});

/* --------------------------------------------------------
   DELETE PART  ->  DELETE /api/parts/:id
---------------------------------------------------------*/
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const exists = await db("inventory").where({ part_id: id }).first();
    if (!exists) {
      return res.status(404).json({ success: 0, message: "Part not found" });
    }

    // optional: delete image file too
    if (exists.image_url) {
      const oldPath = path.join(
        process.cwd(),
        exists.image_url.replace(/^\//, "")
      );
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await db("inventory").where({ part_id: id }).del();

    res.json({ success: 1, message: "Part deleted" });
  } catch (err) {
    console.error("❌ DELETE /api/parts/:id error:", err);
    res.status(500).json({ success: 0, message: "Failed to delete part" });
  }
});

export default router;
