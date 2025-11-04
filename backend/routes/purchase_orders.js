import express from "express";
import { db } from "../db.js";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const router = express.Router();

// ---------------- Paths Setup ----------------
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

function buildMailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

//
// ✅ DASHBOARD ENDPOINTS FIRST (fix route collision)
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

//
// ✅ CREATE PURCHASE ORDER
//
router.post("/", async (req, res) => {
  const body = req.body || {};
  const {
    psr_po_number, order_date, expected_delivery_date, created_by, vendor_id,
    payment_method, payment_terms, currency, remarks, tax_percent,
    shipping_charges, subtotal, tax_amount, grand_total, status = "Draft", items = [],
  } = body;

  if (!psr_po_number || !vendor_id || !created_by) {
    return res.status(400).json({
      success: 0,
      errormsg: "Missing required fields: psr_po_number, vendor_id, or created_by.",
    });
  }

  if (!items.length) return res.status(400).json({ success: 0, errormsg: "At least one item is required" });

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
      total_price: (item.quantity || 0) * (item.unit_price || item.unitPrice || 0),
    }));

    await trx("purchase_order_items").insert(itemsToInsert);
    await trx.commit();

    res.json({ success: 1, po_id });
  } catch (err) {
    await trx.rollback();
    console.error("❌ Create PO error:", err);
    res.status(500).json({ success: 0, errormsg: err.message });
  }
});

// ✅ LIST ALL POs
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
    console.error("❌ Error fetching purchase orders:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to list POs" });
  }
});

// ✅ GET ONE PO
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
        "id", "original_filename", "filepath", "size_bytes", "mime_type", "uploaded_at"
      )
      .where({ po_id: id })
      .orderBy("uploaded_at", "desc");

    res.json({ success: 1, data: { ...po, items, files } });
  } catch (err) {
    console.error("❌ PO fetch error:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to fetch PO details" });
  }
});

// ✅ UPDATE PO
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
    console.error("❌ Update PO error:", err);
    res.status(500).json({ success: 0, errormsg: err.message });
  }
});

// ✅ UPDATE STATUS
router.post("/:id/status", async (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ success: 0, errormsg: "status is required" });

  try {
    await db("purchase_orders").where({ id: req.params.id }).update({ status, updated_at: db.fn.now() });
    res.json({ success: 1, message: "Status updated" });
  } catch (err) {
    res.status(500).json({ success: 0, errormsg: "Failed to update status" });
  }
});

// ✅ UPLOAD FILES
router.post("/:id/upload", upload.array("files", 10), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const po = await db("purchase_orders").where({ id }).first();
    if (!po) return res.status(404).json({ success: 0, errormsg: "PO not found" });

    const safeFiles = req.files.map((f) => ({
      po_id: id,
      original_filename: f.originalname,
      stored_filename: f.filename,
      mime_type: f.mimetype,
      size_bytes: f.size,
      filepath: path.join("/uploads/purchase_orders", f.filename).replace(/\\/g, "/"),
      uploaded_at: db.fn.now(),
    }));

    if (safeFiles.length) await db("purchase_order_files").insert(safeFiles);

    res.json({ success: 1, uploaded: safeFiles.length });
  } catch (err) {
    res.status(500).json({ success: 0, errormsg: "Upload failed" });
  }
});

// ✅ DELETE PO
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

export default router;
