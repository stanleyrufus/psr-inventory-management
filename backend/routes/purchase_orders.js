// backend/routes/purchase_orders.js
import express from "express";
import { db } from "../db.js";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

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

// Small helper to build a transporter from .env
function buildMailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ✅ CREATE PURCHASE ORDER
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

  if (!psr_po_number || !vendor_id || !created_by) {
    return res.status(400).json({
      success: 0,
      errormsg: "Missing required fields: psr_po_number, vendor_id, or created_by.",
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

// ✅ GET PO DETAILS (ensure items + files always returned)
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const po = await db("purchase_orders as po")
      .leftJoin("vendors as v", "po.vendor_id", "v.vendor_id")
      .select("po.*", "v.vendor_name", "v.email as vendor_email")
      .where("po.id", id)
      .first();

    if (!po)
      return res.status(404).json({ success: 0, errormsg: "PO not found" });

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
        "inv.description",
        "inv.current_unit_price",
        "inv.last_unit_price"
      )
      .where("i.po_id", id)
      .orderBy("i.line_no", "asc");

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

    res.json({ success: 1, data: { ...po, items, files } });
  } catch (err) {
    console.error("❌ Get PO error:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to fetch PO details" });
  }
});

// ✅ UPDATE EXISTING PURCHASE ORDER — FIXED to return full data
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
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
    status,
    items = [],
  } = req.body || {};

  if (!psr_po_number || !vendor_id || !created_by) {
    return res.status(400).json({
      success: 0,
      errormsg: "Missing required fields: psr_po_number, vendor_id, or created_by.",
    });
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

    // ✅ Return full refreshed PO (same structure as GET /:id)
    const po = await db("purchase_orders as po")
      .leftJoin("vendors as v", "po.vendor_id", "v.vendor_id")
      .select("po.*", "v.vendor_name", "v.email as vendor_email")
      .where("po.id", id)
      .first();

    const itemsResult = await db("purchase_order_items as i")
      .leftJoin("inventory as inv", "i.part_id", "inv.part_id")
      .select(
        "i.*",
        "inv.part_number",
        "inv.part_name",
        "inv.description",
        "inv.current_unit_price",
        "inv.last_unit_price"
      )
      .where("i.po_id", id)
      .orderBy("i.line_no", "asc");

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

    res.json({
      success: 1,
      message: "PO updated successfully",
      data: { ...po, items: itemsResult, files },
    });
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
    await db("purchase_orders").where({ id }).update({ status, updated_at: db.fn.now() });
    res.json({ success: 1, message: "Status updated successfully" });
  } catch (err) {
    console.error("❌ Update status error:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to update status" });
  }
});

// ✅ UPLOAD FILES (unchanged)
router.post("/:id/upload", upload.array("files", 10), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const po = await db("purchase_orders").where({ id }).first();
    if (!po) return res.status(404).json({ success: 0, errormsg: "PO not found" });

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
        uploaded_at: new Date().toISOString(),
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
    console.error("❌ File upload error:", err);
    res.status(500).json({ success: 0, errormsg: err.message || "Upload failed" });
  }
});

// ✅ SUPPORT ENDPOINTS for dropdowns
router.get("/support/vendors", async (req, res) => {
  try {
    const vendors = await db("vendors")
      .select("vendor_id", "vendor_name", "email")
      .where({ is_active: true })
      .orderBy("vendor_name", "asc");
    res.json({ success: 1, data: vendors });
  } catch (err) {
    console.error("❌ Fetch vendors failed:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to load vendors" });
  }
});

router.get("/support/parts", async (req, res) => {
  try {
    const parts = await db("inventory")
      .select(
        "part_id",
        "part_number",
        "part_name",
        "description",
        "current_unit_price",
        "last_unit_price"
      )
      .where({ status: "Active" })
      .orderBy("part_number", "asc");

    res.json({ success: 1, data: parts });
  } catch (err) {
    console.error("❌ Fetch parts failed:", err);
    res.status(500).json({ success: 0, errormsg: "Failed to load parts" });
  }
});

// ✅ SEND PO TO VENDOR (no pricing)
router.post("/:id/send", async (req, res) => {
  const poId = Number(req.params.id);

  try {
    const po = await db("purchase_orders as po")
      .leftJoin("vendors as v", "po.vendor_id", "v.vendor_id")
      .select(
        "po.id",
        "po.psr_po_number",
        "po.expected_delivery_date",
        "po.remarks",
        "po.vendor_id",
        "po.created_by",
        "v.vendor_name",
        "v.email as vendor_email"
      )
      .where("po.id", poId)
      .first();

    if (!po) return res.status(404).json({ success: 0, errormsg: "PO not found" });

    const poItems = await db("purchase_order_items as i")
      .leftJoin("inventory as inv", "i.part_id", "inv.part_id")
      .select("i.quantity", "inv.part_number", "inv.part_name", "inv.description")
      .where("i.po_id", poId)
      .orderBy("i.line_no", "asc");

    const itemsHtml = poItems
      .map(
        (row) => `
        <tr>
          <td style="border:1px solid #999;padding:6px;">${row.part_number || ""}</td>
          <td style="border:1px solid #999;padding:6px;">${row.part_name || ""}</td>
          <td style="border:1px solid #999;padding:6px;">${row.description || ""}</td>
          <td style="border:1px solid #999;padding:6px;text-align:right;">${row.quantity}</td>
        </tr>`
      )
      .join("");

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#222;">
        <p>Hello ${po.vendor_name || "Vendor"},</p>
        <p>
          Please see the following purchase order request.<br/>
          <strong>PO Number:</strong> ${po.psr_po_number}<br/>
          <strong>Expected Delivery:</strong> ${
            po.expected_delivery_date
              ? new Date(po.expected_delivery_date).toISOString().split("T")[0]
              : "N/A"
          }<br/>
        </p>

        <table style="border-collapse:collapse;border:1px solid #999;font-size:13px;">
          <thead>
            <tr style="background:#eee;">
              <th style="border:1px solid #999;padding:6px;">Part #</th>
              <th style="border:1px solid #999;padding:6px;">Part Name</th>
              <th style="border:1px solid #999;padding:6px;">Description</th>
              <th style="border:1px solid #999;padding:6px;">Qty</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <p><strong>Remarks / Notes:</strong><br/>${po.remarks || "None"}</p>
        <p>Thank you,<br/>${po.created_by || "PSR Purchasing"}</p>
      </div>
    `;

    const transporter = buildMailTransport();
    const mailOptions = {
      from: process.env.SMTP_FROM || "no-reply@psr.local",
      to: po.vendor_email,
      cc: "procurement@psr.local",
      subject: `Purchase Order ${po.psr_po_number}`,
      html: htmlBody,
    };

    await transporter.sendMail(mailOptions);

    await db("purchase_orders").where({ id: poId }).update({
      status: "Sent",
      updated_at: db.fn.now(),
    });

    return res.json({
      success: 1,
      message: "PO emailed to vendor successfully (no pricing).",
    });
  } catch (err) {
    console.error("❌ PO send error:", err);
    return res.status(500).json({ success: 0, errormsg: err.message || "Failed to send PO email" });
  }
});

// ✅ DELETE PURCHASE ORDER (and related items + files)
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    // Check existence
    const po = await db("purchase_orders").where({ id }).first();
    if (!po) {
      return res.status(404).json({ success: 0, message: "Purchase Order not found" });
    }

    // Delete child records first
    await db("purchase_order_items").where({ po_id: id }).del();
    await db("purchase_order_files").where({ po_id: id }).del();

    // Delete main PO
    await db("purchase_orders").where({ id }).del();

    res.json({ success: 1, message: `PO ${po.psr_po_number || id} deleted successfully` });
  } catch (err) {
    console.error("❌ Delete PO error:", err);
    res
      .status(500)
      .json({ success: 0, message: "Failed to delete purchase order", error: err.message });
  }
});

export default router;
