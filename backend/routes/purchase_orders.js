import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import db from "../knex.js";
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

// ---------------- ROUTES ----------------

// ✅ CREATE PURCHASE ORDER
router.post("/", async (req, res) => {
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
  } = req.body || {};

  if (!psr_po_number || !supplier_id || !created_by) {
    return res.status(400).json({
      success: 0,
      errormsg: "Missing required fields: psr_po_number, supplier_id, or created_by.",
    });
  }

  if (!items.length)
    return res.status(400).json({ success: 0, errormsg: "At least one item is required" });

  const trx = await db.transaction();
  try {
    // ✅ Insert PO header
    const inserted = await trx("purchase_orders")
      .insert({
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
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
        purchased_on: db.fn.now(),
      })
      .returning(["id"]);

    const po_id = inserted[0].id;

    // ✅ Insert PO items
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
    return res
      .status(500)
      .json({ success: 0, errormsg: err.message || "Failed to create PO" });
  }
});

// ✅ LIST ALL POs (joined with supplier table, supports ?q search)
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;

    let query = db("purchase_orders as po")
      .leftJoin("suppliers as s", "po.supplier_id", "s.id")
      .select(
        "po.*",
        "s.name as supplier_name",
        "s.contact_person as supplier_contact",
        "s.email as supplier_email",
        "s.phone as supplier_phone"
      )
      .orderBy("po.id", "desc");

    if (q) {
      query = query.where((builder) => {
        builder
          .whereILike("po.psr_po_number", `%${q}%`)
          .orWhereILike("po.remarks", `%${q}%`)
          .orWhereILike("po.created_by", `%${q}%`)
          .orWhereILike("s.name", `%${q}%`);
      });
    }

    const rows = await query;
    res.json(rows);
  } catch (err) {
    console.error("List POs error:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to list POs" });
  }
});

// ✅ GET PO DETAILS (header + items + files)
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const po = await db("purchase_orders as po")
      .leftJoin("suppliers as s", "po.supplier_id", "s.id")
      .select(
        "po.*",
        "s.name as supplier_name",
        "s.contact_person as supplier_contact",
        "s.email as supplier_email",
        "s.phone as supplier_phone"
      )
      .where("po.id", id)
      .first();

    if (!po) return res.status(404).json({ success: 0, errormsg: "PO not found" });

    const items = await db("purchase_order_items")
      .where({ po_id: id })
      .orderBy("line_no", "asc");

    const files = await db("purchase_order_files")
      .where({ po_id: id })
      .orderBy("uploaded_at", "desc");

    res.json({ ...po, items, files });
  } catch (err) {
    console.error("Get PO error:", err);
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
    // ✅ Update header
    await trx("purchase_orders")
      .where({ id })
      .update({
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
        updated_at: db.fn.now(),
      });

    // ✅ Replace all items
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
  if (!status)
    return res.status(400).json({ success: 0, errormsg: "status is required" });

  try {
    await db("purchase_orders")
      .where({ id })
      .update({ status, updated_at: db.fn.now() });
    res.json({ success: 1, message: "Status updated successfully" });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to update status" });
  }
});

// ✅ UPLOAD FILES
router.post("/:id/upload", upload.array("files", 10), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const po = await db("purchase_orders").where({ id }).first();
    if (!po)
      return res.status(404).json({ success: 0, errormsg: "PO not found" });

    const ins = req.files.map((f) => ({
      po_id: id,
      original_filename: f.originalname,
      stored_filename: f.filename,
      mime_type: f.mimetype,
      size_bytes: f.size,
      filepath: path
        .join("/uploads/purchase_orders", f.filename)
        .replace(/\\/g, "/"),
    }));

    if (ins.length) await db("purchase_order_files").insert(ins);
    res.json({ success: 1, uploaded: ins.length, files: ins });
  } catch (err) {
    console.error("Upload files error:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to upload files" });
  }
});

export default router;
