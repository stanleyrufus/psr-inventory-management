// backend/routes/inventory.js

import express from "express";
import { db } from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { makeBasicUploader, resolveUploadPath } from "../middleware/uploads.js";
const upload = makeBasicUploader("parts");


const router = express.Router();

// ⭐ Helpers for image path normalization on backend
function normalizeImagePath(p) {
  if (!p) return null;
  let s = String(p).trim();

  // strip any accidental full URL
  const idxUploads = s.indexOf("/uploads");
  if (idxUploads !== -1) {
    s = s.substring(idxUploads);
  }

  if (!s.startsWith("/")) s = "/" + s;
  return s;
}

function parseImageArray(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map(normalizeImagePath)
        .filter(Boolean);
    }
  } catch {
    // not JSON, fall through
  }
  const single = normalizeImagePath(raw);
  return single ? [single] : [];
}


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

// ============================================================
// GET ALL POs THAT INCLUDE THIS PART
// ============================================================
router.get("/:id/purchase-orders", async (req, res) => {
  const partId = Number(req.params.id);

  try {
    const pos = await db("purchase_orders as po")
      .join("purchase_order_items as i", "po.id", "i.po_id")
      .leftJoin("vendors as v", "po.vendor_id", "v.vendor_id")       // ⭐ ADDED
      .where("i.part_id", partId)
      .select(
        "po.id",
        "po.psr_po_number",
        "po.status",
        "po.order_date",
        "i.quantity",
        "i.unit_price",
        "i.total_price",
        "v.vendor_name"                                             // ⭐ ADDED
      )
      .orderBy("po.id", "desc");

    res.json({ success: true, data: pos });
  } catch (err) {
    console.error("❌ PO lookup error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch PO links" });
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
router.post("/", upload.array("images", 10), async (req, res) => {
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

    // ⭐ If image uploaded → save to permanent folder
   // ⭐ Support MULTIPLE images
if (req.files && req.files.length > 0) {
  insertData.image_url = JSON.stringify(
    req.files.map((f) => `/uploads/parts/${f.filename}`)
  );
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


// UPDATE PART (PUT)
router.put("/:id", upload.array("images", 10), async (req, res) => {
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

    // ⭐ OLD images from DB (normalized array)
    const oldImages = parseImageArray(exists.image_url);

    let keepImages = oldImages;
    let imagesToDelete = [];
    let finalImages = oldImages;

    const hasExistingImagesPayload =
      typeof body.existing_images === "string" && body.existing_images.length > 0;

    // ⭐ If frontend sent existing_images, we trust that as "images to KEEP"
    if (hasExistingImagesPayload) {
      try {
        const parsed = JSON.parse(body.existing_images);
        if (Array.isArray(parsed)) {
          keepImages = parsed.map(normalizeImagePath).filter(Boolean);
        }
      } catch (e) {
        console.error("❌ Failed to parse existing_images:", e);
        keepImages = oldImages; // fallback
      }

      // Which images should be deleted from disk?
      imagesToDelete = oldImages.filter(
        (oldPath) => !keepImages.includes(oldPath)
      );

      // Delete removed images from disk
      imagesToDelete.forEach((img) => {
        const full = resolveUploadPath(img);
        try {
          if (full && fs.existsSync(full)) {
            fs.unlinkSync(full);
          }
        } catch (e) {
          console.error("❌ Error deleting old image:", e);
        }
      });
    }

    // ⭐ New uploaded files (if any)
    const newUploaded = (req.files || []).map((f) =>
      normalizeImagePath(`/uploads/parts/${f.filename}`)
    );

    // ⭐ Build final image list
    if (hasExistingImagesPayload || (req.files && req.files.length > 0)) {
      finalImages = [...keepImages, ...newUploaded];
      if (finalImages.length > 0) {
        updateData.image_url = JSON.stringify(finalImages);
      } else {
        updateData.image_url = null;
      }
    } else {
      // No change requested to images → keep DB as-is
      finalImages = oldImages;
    }

    await db("inventory").where({ part_id: id }).update(updateData);

    res.json({
      success: 1,
      message: "Part updated successfully",
      image_updated:
        JSON.stringify(finalImages) !== JSON.stringify(oldImages),
    });
  } catch (err) {
    console.error("❌ PUT /api/parts/:id error:", err);

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

    // ⭐ Delete all images (supports JSON array)
    if (exists.image_url) {
      try {
        const images = JSON.parse(exists.image_url || "[]");

        images.forEach((img) => {
          const fullPath = resolveUploadPath(img);
          if (fullPath && fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        });
      } catch (e) {
        console.error("❌ Image delete error:", e);
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
