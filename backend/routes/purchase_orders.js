import express from "express";
import { db } from "../db.js";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { makeSafeUploader } from "../middleware/uploads.js";

const uploadPo = makeSafeUploader("po-attachments");


const router = express.Router();

// ---------------- Paths Setup ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// -------- Helpers --------
const normalizeDate = (d) => (d && String(d).trim() !== "" ? d : null);

function buildMailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

//
// =============================================
//  DASHBOARD ENDPOINTS
// =============================================
//

// Count
router.get("/count", async (_, res) => {
  try {
    const r = await db("purchase_orders").count("id as count").first();
    res.json({ count: Number(r.count) });
  } catch (err) {
    console.error("❌ PO count error:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to compute PO count" });
  }
});

// Recent POs
router.get("/recent", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "5"), 50);
    const rows = await db("purchase_orders as po")
      .leftJoin("vendors as v", "po.vendor_id", "v.vendor_id")
      .select(
        "po.id",
        "po.psr_po_number",
        "po.order_date",
        "po.status",
        "v.vendor_name",
        "po.grand_total"
      )
      .orderBy("po.id", "desc")
      .limit(limit);

    res.json({ success: 1, data: rows });
  } catch (err) {
    console.error("❌ Recent POs error:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to fetch recent POs" });
  }
});

// Monthly PO status summary
router.get("/status/monthly", async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months || "6"), 24);

    const rows = await db("purchase_orders")
      .whereNotNull("order_date")
      .select(
        db.raw(`to_char(date_trunc('month', order_date), 'YYYY-MM') as ym`),
        db.raw(`SUM(CASE WHEN status ILIKE 'Draft' THEN 1 ELSE 0 END)::int as draft`),
        db.raw(`SUM(CASE WHEN status ILIKE 'Pending' THEN 1 ELSE 0 END)::int as pending`),
        db.raw(`SUM(CASE WHEN status ILIKE 'Sent' THEN 1 ELSE 0 END)::int as sent`),
        db.raw(`SUM(CASE WHEN status ILIKE 'Completed' THEN 1 ELSE 0 END)::int as completed`)
      )
      .groupByRaw("date_trunc('month', order_date)")
      .orderByRaw("date_trunc('month', order_date) desc")
      .limit(months);

    res.json({ success: 1, data: rows.reverse() });
  } catch (err) {
    console.error("❌ PO monthly status error:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to compute monthly PO status" });
  }
});


// =============================================
//  CREATE PO
// =============================================


// CHECK duplicate number (supports edit mode)
router.get("/check-number/:psr_po_number", async (req, res) => {
  try {
    const { psr_po_number } = req.params;
    const excludeId = req.query.excludeId ? Number(req.query.excludeId) : null;

    const q = db("purchase_orders").where({ psr_po_number });

    if (excludeId) q.andWhereNot("id", excludeId);

    const existing = await q.first();
    res.json({ exists: !!existing });
  } catch (err) {
    res.status(500).json({ exists: false });
  }
});

// =============================================
//  CREATE PO  (supports Draft mode)
// =============================================
router.post("/", async (req, res) => {
  const body = req.body || {};
  const {
    psr_po_number,
    order_date,
    expected_delivery_date,
    created_by,
    vendor_id,
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

  // ======================================================
// ⭐ 1. DRAFT MODE — Save everything INCLUDING ITEMS
// ======================================================
if (status === "Draft") {
  if (!psr_po_number) {
    return res.status(400).json({
      success: 0,
      errormsg: "PO Number is required to save draft.",
    });
  }

  const trx = await db.transaction();
  try {
    const inserted = await trx("purchase_orders")
      .insert({
        psr_po_number,
        status: "Draft",
        remarks: remarks || null,
        created_by: created_by || null,
        vendor_id: vendor_id || null,
        order_date: normalizeDate(order_date),
        expected_delivery_date: normalizeDate(expected_delivery_date),
        subtotal: subtotal || 0,
        tax_amount: tax_amount || 0,
        grand_total: grand_total || 0,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning(["id"]);

    const po_id = inserted[0].id;

    if (items && items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        po_id,
        line_no: index + 1,
        part_id: item.part_id || item.partId,
        quantity: item.quantity,
        unit_price: item.unit_price || item.unitPrice,
        total_price: item.total_price || item.totalPrice,
      }));

      await trx("purchase_order_items").insert(itemsToInsert);
    }

    await trx.commit();

    return res.json({
      success: 1,
      po_id,
      draft: true,
      message: "Draft saved successfully",
    });

  } catch (err) {
    await trx.rollback();
    console.error("❌ Draft save error:", err);
    return res.status(500).json({
      success: 0,
      errormsg: "Failed to save draft with items.",
    });
  }
}


  // ======================================================
  // ⭐ 2. NORMAL CREATE PO MODE (FULL VALIDATION)
  // ======================================================

  if (!psr_po_number || !vendor_id || !created_by) {
    return res.status(400).json({
      success: 0,
      errormsg:
        "Missing required fields: psr_po_number, vendor_id, created_by.",
    });
  }

  if (!items.length) {
    return res.status(400).json({
      success: 0,
      errormsg: "At least one item is required.",
    });
  }

  // Duplicate check (normal create only)
  const exists = await db("purchase_orders").where({ psr_po_number }).first();
  if (exists) {
    return res.status(400).json({
      success: 0,
      errormsg: "PO Number already exists. Use a unique number.",
    });
  }

  const trx = await db.transaction();
  try {
    const inserted = await trx("purchase_orders")
      .insert({
        psr_po_number,
        order_date: normalizeDate(order_date),
        expected_delivery_date: normalizeDate(expected_delivery_date),
        created_by,
        vendor_id,
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
      total_price:
        (item.quantity || 0) * (item.unit_price || item.unitPrice || 0),
    }));

    await trx("purchase_order_items").insert(itemsToInsert);

    await trx.commit();

    res.json({ success: 1, po_id });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ success: 0, errormsg: err.message });
  }
});


//
// =============================================
//  LIST & GET PO
// =============================================
//

router.get("/", async (req, res) => {
  try {
    const rows = await db("purchase_orders as po")
      .leftJoin("vendors as v", "po.vendor_id", "v.vendor_id")
      .select(
        "po.id",
        "po.psr_po_number",
        "po.vendor_id",
        "v.vendor_name",
        "po.subtotal",
        "po.tax_amount",
        "po.shipping_charges",
        "po.grand_total",
        "po.order_date",
        "po.status",
        "po.created_by"
      )
      .orderBy("po.id", "desc");

    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: 0, errormsg: "Failed to list POs" });
  }
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const po = await db("purchase_orders as po")
      .leftJoin("vendors as v", "po.vendor_id", "v.vendor_id")
      .select("po.*", "v.vendor_name", "v.email as vendor_email")
      .where("po.id", id)
      .first();

    if (!po) return res.status(404).json({ success: 0, errormsg: "PO not found" });

    const items = await db("purchase_order_items as i")
      .leftJoin("inventory as inv", "i.part_id", "inv.part_id")
      .select(
        "i.id",
        "i.part_id",
        "i.line_no",
        "i.quantity",
        "i.unit_price",
        "i.total_price",
        "inv.part_number",
        "inv.part_name",
        "inv.description"
      )
      .where("i.po_id", id)
      .orderBy("i.line_no");

    const files = await db("purchase_order_files")
      .select(
        "id",
        "original_filename",
        "filepath",
        "size_bytes",
        "mime_type",
        "uploaded_at"
      )
      .where({ po_id: id })
      .orderBy("uploaded_at", "desc");

    // 🔥 CRITICAL FIX: always return a PUBLIC path
    const normalizedFiles = files.map((f) => ({
      ...f,
  filepath: `/uploads/po-attachments/${path.basename(f.filepath)}`,
    }));

    res.json({ success: 1, data: { ...po, items, files: normalizedFiles } });
  } catch (err) {
    res.status(500).json({ success: 0, errormsg: "Failed to fetch PO details" });
  }
});

//
// =============================================
//  UPDATE PO (no attachment issues here)
// =============================================
//

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);

  const {
    psr_po_number, order_date, expected_delivery_date, created_by, vendor_id,
    payment_method, payment_terms, currency, remarks, tax_percent,
    shipping_charges, subtotal, tax_amount, grand_total, status, items = [],
  } = req.body || {};

  if (!psr_po_number || !vendor_id || !created_by) {
    return res.status(400).json({ success: 0, errormsg: "Missing required fields" });
  }

  const trx = await db.transaction();
  try {
    await trx("purchase_orders").where({ id }).update({
      psr_po_number,
      order_date: normalizeDate(order_date),
      expected_delivery_date: normalizeDate(expected_delivery_date),
      created_by,
      vendor_id,
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
    res.status(500).json({ success: 0, errormsg: err.message });
  }
});

//
// =============================================
//  UPLOAD PO ATTACHMENTS (Permanent Storage)
// =============================================
// =============================================
//  UPLOAD PO ATTACHMENTS (final fix)
// =============================================
router.post("/:id/upload", uploadPo, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const po = await db("purchase_orders").where({ id }).first();
    if (!po) {
      return res.status(404).json({
        success: 0,
        errormsg: "PO not found",
      });
    }

    // Multer raw file objects (CANNOT return directly!)
    const uploadedFiles = req.files || [];

    // Convert to SAFE POJO objects (NO circular refs)
    const safeFiles = uploadedFiles.map((file) => ({
      po_id: id,
      original_filename: file.originalname,
      stored_filename: file.filename,
      mime_type: file.mimetype,
      size_bytes: file.size,
filepath: `/uploads/po-attachments/${file.filename}`,

      uploaded_at: new Date().toISOString(),
    }));

    // Insert into DB
    if (safeFiles.length > 0) {
      await db("purchase_order_files").insert(safeFiles);
    }

    // ⭐ RETURN ONLY SAFE JSON (no req, no timeout, no callbacks)
    return res.json({
      success: 1,
      uploaded: safeFiles.length,
      files: safeFiles
    });

  } catch (err) {
    console.error("❌ Upload fatal:", err);
    return res.status(500).json({
      success: 0,
      errormsg: err.message || "Upload failed",
    });
  }
});

// =============================================
// DELETE PO
// =============================================
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const po = await db("purchase_orders").where({ id }).first();
    if (!po) return res.status(404).json({ success: 0, message: "PO not found" });

    await db("purchase_order_items").where({ po_id: id }).del();
    await db("purchase_order_files").where({ po_id: id }).del();
    await db("purchase_orders").where({ id }).del();

    res.json({ success: 1, message: `PO ${po.psr_po_number} deleted` });
  } catch (err) {
    res.status(500).json({ success: 0, message: "Delete failed", error: err.message });
  }
});

// =============================================
// DELETE ONE ATTACHMENT
// =============================================
router.delete("/:po_id/file/:file_id", async (req, res) => {
  const { po_id, file_id } = req.params;

  try {
    const file = await db("purchase_order_files").where({ id: file_id }).first();

    if (!file) return res.status(404).json({ success: 0, message: "File not found" });

    // physical file path
    const fullPath = path.join(process.cwd(), file.filepath);

    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    await db("purchase_order_files").where({ id: file_id }).del();

    res.json({ success: 1, message: "File deleted" });
  } catch (err) {
    res.status(500).json({ success: 0, message: "Delete error", err });
  }
});

export default router;
