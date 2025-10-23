import express from "express";
import { db } from "../db.js";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";

const router = express.Router();

// ---------------- Paths ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.resolve(__dirname, "..", "..", "uploads", "purchase_orders");
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

// ---------------- Multer setup ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${ts}_${safe}`);
  },
});
const upload = multer({ storage });

// -------- Helpers --------
const normalizeDate = (d) => (d && String(d).trim() !== "" ? d : null);

// ✅ CREATE PURCHASE ORDER
router.post("/", async (req, res) => {
  const body = req.body || {};
  const {
    psr_po_number,
    order_date,
    expected_delivery_date,
    created_by,
    supplier_id,
    payment_method,
    payment_terms,
    currency,
    remarks,
    tax_percent,
    shipping_charges,
    subtotal,
    tax_amount,
    grand_total,
    status = "Draft",
    items = [],
  } = body;

  if (!psr_po_number || !supplier_id || !created_by) {
    return res.status(400).json({
      success: 0,
      errormsg: "Missing required fields: psr_po_number, supplier_id, or created_by.",
    });
  }

  if (!items.length) {
    return res.status(400).json({ success: 0, errormsg: "At least one item is required" });
  }

  const trx = await db.transaction();
  try {
    const inserted = await trx("purchase_orders")
      .insert({
        psr_po_number,
        order_date: normalizeDate(order_date),
        expected_delivery_date: normalizeDate(expected_delivery_date),
        created_by,
        supplier_id,
        payment_method,
        payment_terms,
        currency,
        remarks,
        tax_percent,
        shipping_charges,
        subtotal,
        tax_amount,
        grand_total,
        status,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
        purchased_on: db.fn.now(),
      })
      .returning(["id"]);

    const po_id = inserted[0].id;

    const itemsToInsert = items.map((item, index) => ({
      po_id,
      line_no: index + 1,
      part_id: item.part_id || item.partId,
      quantity: item.quantity,
      unit_price: item.unit_price || item.unitPrice,
      total_price: (item.quantity || 0) * (item.unit_price || item.unitPrice || 0),
    }));

    await trx("purchase_order_items").insert(itemsToInsert);

    await trx.commit();
    return res.json({ success: 1, po_id });
  } catch (err) {
    await trx.rollback();
    console.error("❌ Create PO error:", err);
    return res.status(500).json({
      success: 0,
      errormsg: err.message || "Failed to create PO",
    });
  }
});

// ✅ LIST ALL POs
router.get("/", async (req, res) => {
  try {
    const rows = await db("purchase_orders")
      .select(
        "id",
        "psr_po_number",
        "supplier_id",
        "subtotal",
        "tax_amount",
        "shipping_charges",
        "grand_total",
        "order_date",
        "status",
        "created_by"
      )
      .orderBy("id", "desc");

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching purchase orders:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to list POs" });
  }
});

// ✅ GET PO DETAILS
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const po = await db("purchase_orders").where({ id }).first();
    if (!po) return res.status(404).json({ success: 0, errormsg: "PO not found" });

    const items = await db("purchase_order_items").where({ po_id: id }).orderBy("line_no", "asc");
    const files = await db("purchase_order_files").where({ po_id: id }).orderBy("uploaded_at", "desc");

    res.json({ ...po, items, files });
  } catch (err) {
    console.error("❌ Get PO error:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to fetch PO details" });
  }
});

// ✅ UPDATE EXISTING PURCHASE ORDER
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const {
    psr_po_number,
    order_date,
    expected_delivery_date,
    created_by,
    supplier_id,
    payment_method,
    payment_terms,
    currency,
    remarks,
    tax_percent,
    shipping_charges,
    subtotal,
    tax_amount,
    grand_total,
    status,
    items = [],
  } = req.body || {};

  if (!psr_po_number || !supplier_id || !created_by) {
    return res.status(400).json({
      success: 0,
      errormsg: "Missing required fields: psr_po_number, supplier_id, or created_by.",
    });
  }

  const trx = await db.transaction();
  try {
    await trx("purchase_orders")
      .where({ id })
      .update({
        psr_po_number,
        order_date: normalizeDate(order_date),
        expected_delivery_date: normalizeDate(expected_delivery_date),
        created_by,
        supplier_id,
        payment_method,
        payment_terms,
        currency,
        remarks,
        tax_percent,
        shipping_charges,
        subtotal,
        tax_amount,
        grand_total,
        status,
        updated_at: db.fn.now(),
      });

    await trx("purchase_order_items").where({ po_id: id }).del();

    const itemsToInsert = items.map((item, index) => ({
      po_id: id,
      line_no: index + 1,
      part_id: item.part_id || item.partId,
      quantity: item.quantity,
      unit_price: item.unit_price || item.unitPrice,
      total_price: (item.quantity || 0) * (item.unit_price || item.unitPrice || 0),
    }));

    if (itemsToInsert.length > 0) {
      await trx("purchase_order_items").insert(itemsToInsert);
    }

    await trx.commit();
    res.json({ success: 1, message: "PO updated successfully" });
  } catch (err) {
    await trx.rollback();
    console.error("❌ Update PO error:", err);
    res.status(500).json({ success: 0, errormsg: err.message || "Failed to update PO" });
  }
});

// ✅ UPDATE STATUS
router.post("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ success: 0, errormsg: "status is required" });

  try {
    await db("purchase_orders").where({ id }).update({ status, updated_at: db.fn.now() });
    res.json({ success: 1, message: "Status updated successfully" });
  } catch (err) {
    console.error("❌ Update status error:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to update status" });
  }
});

// ✅ UPLOAD FILES (final circular-proof version)
router.post("/:id/upload", upload.array("files", 10), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const po = await db("purchase_orders").where({ id }).first();
    if (!po) {
      return res.status(404).json({ success: 0, errormsg: "PO not found" });
    }

    // Prepare safe plain objects — no references to multer's internal fields
    const safeFiles = (req.files || []).map((f) => {
      const stored_filename = f.filename;
      const filepath = path.join("/uploads/purchase_orders", stored_filename).replace(/\\/g, "/");

      return {
        po_id: id,
        original_filename: f.originalname,
        stored_filename,
        mime_type: f.mimetype,
        size_bytes: f.size,
        filepath,
        uploaded_at: new Date().toISOString(), // not db.fn.now() because that returns a knex object
      };
    });

    if (safeFiles.length > 0) {
      await db("purchase_order_files").insert(
        safeFiles.map((f) => ({
          po_id: f.po_id,
          original_filename: f.original_filename,
          stored_filename: f.stored_filename,
          mime_type: f.mime_type,
          size_bytes: f.size_bytes,
          filepath: f.filepath,
          uploaded_at: db.fn.now(),
        }))
      );
    }

    // ✅ Return only plain serializable JSON
    return res.status(200).json({
      success: 1,
      uploaded: safeFiles.length,
      files: safeFiles.map((f) => ({
        original_filename: f.original_filename,
        filepath: f.filepath,
        size_bytes: f.size_bytes,
      })),
    });
  } catch (err) {
    try {
      console.error("❌ File upload error:", err);
      let safeMsg = "Unknown error during file upload";
      if (err && typeof err.message === "string") safeMsg = err.message;
      else if (typeof err === "string") safeMsg = err;

      return res.status(500).json({ success: 0, errormsg: safeMsg });
    } catch (inner) {
      console.error("❌ Secondary serialization error:", inner);
      res.status(500).type("text/plain").send("Upload failed due to internal error.");
    }
  }
});

export default router;
