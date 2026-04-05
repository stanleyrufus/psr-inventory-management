// backend/routes/purchase_orders.js
import express from "express";
import { db } from "../db.js";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { makeSafeUploader } from "../middleware/uploads.js";
import { createRequire } from "module";
import { requirePermission } from "../middleware/auth.js";

// ---------------------------------------------
// ---------------------------------------------
// ---------------------------------------------
// PDF PARSER (supports pdf-parse v1 FUNCTION and v2+ PDFParse CLASS)
// ---------------------------------------------
const require = createRequire(import.meta.url);
const pdfParsePkg = require("pdf-parse");

// v1 style: pdfParse(buffer) => { text, ... }
const pdfParseFn =
  typeof pdfParsePkg === "function"
    ? pdfParsePkg
    : typeof pdfParsePkg?.default === "function"
    ? pdfParsePkg.default
    : null;

// v2+ style: exports an object containing PDFParse class
const PDFParseClass =
  pdfParsePkg?.PDFParse ||
  pdfParsePkg?.default?.PDFParse ||
  null;

// Robust helper that always returns { text: "..." }
async function parsePdfToText({ buffer, filePath }) {
  // Prefer v1 function if available
  if (pdfParseFn) {
    return await pdfParseFn(buffer);
  }

  // Otherwise use v2+ class
  if (PDFParseClass) {
  // ✅ pdf-parse v2+ expects options in constructor (verbosity) and pdf input via url/data
  const opts = filePath
    ? { url: filePath, verbosity: 0 }
    : { data: buffer, verbosity: 0 };

  const parser = new PDFParseClass(opts);

  const out = await (typeof parser.getText === "function"
    ? parser.getText()
    : parser.getRaw());

  if (typeof parser.destroy === "function") {
    await parser.destroy();
  }

  const text =
    typeof out === "string"
      ? out
      : typeof out?.text === "string"
      ? out.text
      : String(out ?? "");

  return { text };
}


  throw new TypeError(
    `pdf-parse export not supported. Keys: ${Object.keys(pdfParsePkg || {}).join(", ")}`
  );
}

const router = express.Router();

// ✅ Safe uploader for PO attachments
// NOTE: makeSafeUploader implementations vary across projects, so we resolve it safely below.
const uploadPo = makeSafeUploader("po-attachments");

// ---------------- Paths Setup ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------- Helpers --------
const normalizeDate = (d) => (d && String(d).trim() !== "" ? d : null);

// ✅ Helper: system date in YYYY-MM-DD (server date)
const systemDateYmd = () => new Date().toISOString().slice(0, 10);

/**
 * ✅ Resolve uploader middleware safely
 *
 * Some makeSafeUploader() implementations return:
 *  - Multer instance: has .array/.single/.fields
 *  - { upload: multerInstance, uploadDir: "..." }
 *  - direct middleware function (req,res,next)
 */
const resolvePoUploadMiddleware = () => {
  // Case A: uploadPo is a Multer instance
  if (uploadPo && typeof uploadPo.array === "function") {
    return uploadPo.array("files");
  }

  // Case B: uploadPo is { upload: multerInstance, ... }
  if (uploadPo?.upload && typeof uploadPo.upload.array === "function") {
    return uploadPo.upload.array("files");
  }

  // Case C: uploadPo is already a middleware function
  if (typeof uploadPo === "function") {
    return uploadPo;
  }

  // Fallback: local multer disk storage (keeps project working)
  const uploadRoot = path.resolve(process.cwd(), "uploads", "po-attachments");
  if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadRoot),
    filename: (_, file, cb) => {
      const safeName = `${Date.now()}-${file.originalname}`.replace(
        /[/\\?%*:|"<>]/g,
        "-"
      );
      cb(null, safeName);
    },
  });

  const fallback = multer({ storage });
  return fallback.array("files");
};

//
// =============================================
//  DASHBOARD ENDPOINTS
// =============================================
//
router.get("/count", async (_, res) => {
  try {
    const r = await db("purchase_orders").count("id as count").first();
    res.json({ count: Number(r.count) });
  } catch (err) {
    res.status(500).json({ success: 0 });
  }
});

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
  } catch {
    res.status(500).json({ success: 0 });
  }
});

// =============================================
//  DASHBOARD: PO TREND (MONTHLY COUNT)f
//  GET /api/purchase_orders/trend/monthly?months=6
//  Returns: [{ ym: "YYYY-MM", count: 12 }, ...]
// =============================================
router.get("/trend/monthly", async (req, res) => {
  try {
    const months = Math.min(Number(req.query.months || 12), 24);

    const rows = await db("purchase_orders")
      .select(
        db.raw(`to_char(order_date, 'YYYY-MM') as ym`),
        db.raw(`COUNT(*)::int as count`),
        db.raw(`COALESCE(SUM(grand_total),0)::numeric as total_value`)
      )
      .whereRaw(
        `order_date >= (date_trunc('month', CURRENT_DATE) - interval '${months - 1} months')`
      )
      .groupBy("ym")
      .orderBy("ym", "asc");

    res.json({ success: 1, data: rows });
  } catch (err) {
    console.error("❌ PO trend/monthly error:", err);
    res.status(500).json({
      success: 0,
      message: "Failed to load PO monthly trend",
    });
  }
});

// ✅ GET /api/purchase_orders/status/monthly?months=6
router.get("/status/monthly", async (req, res) => {
  try {
    const months = Math.max(1, Math.min(24, Number(req.query.months || 6)));

    // Build month labels: oldest -> newest (YYYY-MM)
    const monthLabels = [];
    const now = new Date();
    const firstMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    for (let i = 0; i < months; i++) {
      const d = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthLabels.push(ym);
    }

    // Start date = first month (YYYY-MM-01)
    const startYmd = `${monthLabels[0]}-01`;

    // Pull grouped counts by month + status
    const rows = await db("purchase_orders")
      .where("order_date", ">=", startYmd)
      .select(
        db.raw(`to_char(date_trunc('month', order_date), 'YYYY-MM') as ym`),
        db.raw(`lower(coalesce(status, 'draft')) as status`),
        db.raw(`count(*)::int as cnt`)
      )
      .groupBy("ym", "status")
      .orderBy("ym", "asc");

    // Normalize your real statuses into the dashboard buckets
const normalizeStatus = (s) => {
  const x = String(s || "").toLowerCase().trim();

  if (x === "draft") return "draft";
  if (x === "pending") return "pending";
  if (x === "sent") return "sent";
  if (x === "completed") return "completed";

  if (x === "reserved") return "pending";
  if (x === "ordered") return "pending";
  if (x === "back ordered") return "pending";
  if (x === "paid") return "completed";
  if (x === "received") return "completed";
  if (x === "closed") return "completed";

  return null;
};

    // Initialize months with zeros
    const outMap = {};
    monthLabels.forEach((ym) => {
      outMap[ym] = { ym, draft: 0, pending: 0, sent: 0, completed: 0 };
    });

    // Apply counts
    for (const r of rows) {
      const ym = r.ym;
      if (!outMap[ym]) continue;

      const bucket = normalizeStatus(r.status);
      if (!bucket) continue;

      outMap[ym][bucket] += Number(r.cnt || 0);
    }

    // Send array in correct order
    const data = monthLabels.map((ym) => outMap[ym]);

    return res.json({ success: 1, data });
  } catch (err) {
    console.error("❌ /purchase_orders/status/monthly error:", err);
    return res.status(500).json({
      success: 0,
      message: "Failed to load PO status trend",
    });
  }
});

// =============================================
// DASHBOARD: PARTS BOUGHT MONTHLY
// GET /api/purchase_orders/items/monthly?months=6
// Returns: [{ ym: "YYYY-MM", qty: "123", total_value: "456.78" }]
// =============================================
router.get("/items/monthly", async (req, res) => {
  try {
    const months = Math.min(Number(req.query.months || 6), 24);

    const rows = await db("purchase_orders as po")
      .join("purchase_order_items as i", "i.po_id", "po.id")
      .whereRaw(
        `po.order_date >= (date_trunc('month', CURRENT_DATE) - interval '${months - 1} months')`
      )
      .select(
        db.raw(`to_char(po.order_date, 'YYYY-MM') as ym`),
        db.raw(`COALESCE(SUM(COALESCE(i.quantity::numeric,0)),0) as qty`),
        db.raw(
          `COALESCE(SUM(COALESCE(i.quantity::numeric,0) * COALESCE(i.unit_price::numeric,0)),0) as total_value`
        )
      )
      .groupBy("ym")
      .orderBy("ym", "asc");

    return res.json({ success: 1, data: rows });
  } catch (err) {
    console.error("❌ items/monthly error:", err);
    return res
      .status(500)
      .json({ success: 0, message: "Failed to load parts bought trend" });
  }
});

// =============================================
// DASHBOARD: TOP 5 VENDORS BY SPEND (12 MONTHS)
// GET /api/purchase_orders/vendors/top-spend
// =============================================
router.get("/vendors/top-spend", async (req, res) => {
  try {
    const rows = await db("purchase_orders as po")
      .join("vendors as v", "v.vendor_id", "po.vendor_id")
      .whereRaw(`po.order_date >= CURRENT_DATE - interval '12 months'`)
      .select(
        "v.vendor_id",
        "v.vendor_name",
        db.raw("COALESCE(SUM(po.grand_total),0) as total_spend")
      )
      .groupBy("v.vendor_id", "v.vendor_name")
      .orderBy("total_spend", "desc")
      .limit(5);

    res.json({ success: 1, data: rows });
  } catch (err) {
    console.error("❌ top-spend error:", err);
    res.status(500).json({ success: 0 });
  }
});

//
// =============================================
//  IMPORT PO FROM PDF
// =============================================
//
const uploadPdf = multer({ dest: "uploads/tmp" });

router.post(
  "/import-from-pdf",
  requirePermission("edit_purchase_orders"),
  uploadPdf.array("files"),
  async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: 0,
        message: "No PDF files uploaded",
      });
    }

    const results = [];

    for (const file of req.files) {
      const buffer = fs.readFileSync(file.path);

      // ✅ parser is pdfParse (Node 22 + ESM safe)
const parsed = await parsePdfToText({ buffer, filePath: file.path });

      results.push({
        filename: file.originalname,
        textPreview: parsed.text.slice(0, 1500),
      });

      fs.unlinkSync(file.path); // cleanup temp file
    }

    return res.json({
      success: 1,
      message: "PDF uploaded successfully",
      previews: results,
    });
  } catch (err) {
    console.error("❌ PDF import error:", err);
    return res.status(500).json({
      success: 0,
      message: "Failed to import PDF",
    });
  }
});

//
// =============================================
//  LIST PO
// =============================================
//
router.get("/", async (_, res) => {
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
  "po.created_at",   // ✅ ADD THIS

      "po.status",
      "po.created_by"
    )
    .orderBy("po.id", "desc");

  res.json(rows);
});

// =============================================
//  NEXT PO NUMBER (AUTO-GENERATE PREVIEW)
//  GET /api/purchase_orders/next-number
//  Format: POMMDDYY-01
// =============================================
router.get("/next-number", async (req, res) => {
  try {
    const now = new Date();

    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const yymmdd = `${yy}${mm}${dd}`;
    const prefix = `PO${yymmdd}-`; // PO260315-

    // Find the highest sequence for TODAY (prefix match)
    const r = await db("purchase_orders")
      .where("psr_po_number", "like", `${prefix}%`)
      .max("psr_po_number as max")
      .first();

    let nextSeq = 1;

    if (r?.max) {
      const last = String(r.max);
      const lastSeqStr = last.split("-").pop();
      const lastSeq = Number(lastSeqStr);
      if (!Number.isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    const seqStr = String(nextSeq).padStart(2, "0");
    const nextNumber = `${prefix}${seqStr}`;

    const yyyy = now.getFullYear();
    return res.json({
      success: 1,
      psr_po_number: nextNumber,
      order_date: `${yyyy}-${mm}-${dd}`,
    });
  } catch (err) {
    console.error("❌ next-number error:", err);
    return res
      .status(500)
      .json({ success: 0, message: "Failed to generate PO number" });
  }
});


//
// =============================================
//  RESERVE PO NUMBER (PLACEHOLDER PO)
//  POST /api/purchase_orders/reserve
//  - Requires: psr_po_number, created_by
//  - Optional: vendor_id, remarks
//  - Creates a purchase_orders row with status = "Reserved"
//  - NO items required
// =============================================
//
router.post("/reserve", requirePermission("edit_purchase_orders"), async (req, res) => {
  try {
    const body = req.body || {};

    const psrPo = String(body.psr_po_number || "").trim();
    if (!psrPo) {
      return res.status(400).json({
        success: 0,
        message: "psr_po_number is required",
      });
    }

    const createdBy = String(body.created_by || "").trim();
    if (!createdBy) {
      return res.status(400).json({
        success: 0,
        message: "created_by is required",
      });
    }

// ✅ vendor_id REQUIRED
const vendorId = Number(body.vendor_id);

if (!vendorId || Number.isNaN(vendorId)) {
  return res.status(400).json({
    success: 0,
    message: "vendor_id is required",
  });
}
    // ✅ system date (same rule you use elsewhere)
    const orderDate = systemDateYmd();

    // ✅ prevent duplicates
    const exists = await db("purchase_orders")
      .where({ psr_po_number: psrPo })
      .first();

    if (exists) {
      return res.status(409).json({
        success: 0,
        message: "This PO number is already used/reserved. Please regenerate.",
      });
    }

    const inserted = await db("purchase_orders")
      .insert({
        psr_po_number: psrPo,
        order_date: orderDate,
        status: "Reserved",
        created_by: createdBy,
        vendor_id: vendorId, // can be null
        remarks: body.remarks || null,

        // safe defaults
        payment_method: null,
        payment_terms: null,
        currency: "USD",
        received_by: null,
        received_on: null,
        tax_percent: 0,
        shipping_charges: 0,
        subtotal: 0,
        tax_amount: 0,
        grand_total: 0,
        date_paid: null,
      })
      .returning(["id", "psr_po_number", "order_date", "status"]);

    return res.json({ success: 1, data: inserted[0] });
  } catch (err) {
    console.error("❌ RESERVE PO error:", err);
    return res.status(500).json({ success: 0, message: "Failed to reserve PO" });
  }
});


//
// =====================================================
// ✅ CREATE PO
// POST /api/purchase_orders
// - Uses system date for order_date
// - Uses psr_po_number from frontend (from /next-number)
// - Inserts items into purchase_order_items
//
// ✅ NEW: Validations enforced on FIRST SAVE (even Draft)
//   - created_by required
//   - vendor_id required
//   - at least 1 item required
//   - every item must have part_id
//   - every item must have unit_price > 0
//   - quantity > 0
// =====================================================
//
router.post("/", requirePermission("edit_purchase_orders"), async (req, res) => {
  try {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];

    // ✅ Always set order_date to system date (your rule)
    const orderDate = systemDateYmd();

    // ✅ Use the PO number sent by frontend
    const psrPo = String(body.psr_po_number || "").trim();
    if (!psrPo) {
      return res.status(400).json({
        success: 0,
        field: "psr_po_number",
        message: "PO number missing. Reload page to generate a new PO number.",
      });
    }

    // =====================================================
    // ✅ VALIDATIONS (FIRST SAVE - even Draft)
    // =====================================================

    // created_by required
    const createdBy = String(body.created_by || "").trim();
    if (!createdBy) {
      return res.status(400).json({
        success: 0,
        field: "created_by",
        message: "Ordered By (Created By) is required.",
      });
    }

    // vendor_id required
    const vendorId = Number(body.vendor_id);
    if (!vendorId || Number.isNaN(vendorId)) {
      return res.status(400).json({
        success: 0,
        field: "vendor_id",
        message: "Vendor is required.",
      });
    }

    // at least 1 item required
    if (!items.length) {
      return res.status(400).json({
        success: 0,
        field: "items",
        message: "Add at least one part before saving the PO (even Draft).",
      });
    }

    // every item must be valid
for (let idx = 0; idx < items.length; idx++) {
  const it = items[idx] || {};

  const partId = Number(it.part_id);
  if (!partId || Number.isNaN(partId)) {
    return res.status(400).json({
      success: 0,
      field: `items[${idx}].part_id`,
      message: `Line ${idx + 1}: Part is required.`,
    });
  }

  const qty = Number(it.quantity);
  if (!qty || Number.isNaN(qty) || qty <= 0) {
    return res.status(400).json({
      success: 0,
      field: `items[${idx}].quantity`,
      message: `Line ${idx + 1}: Quantity must be greater than 0.`,
    });
  }

const unitPriceRaw = it.unit_price;
const unitPrice = Number(unitPriceRaw);

if (
  unitPriceRaw === "" ||
  unitPriceRaw === null ||
  unitPriceRaw === undefined ||
  Number.isNaN(unitPrice) ||
  unitPrice < 0
) {
  return res.status(400).json({
    success: 0,
    field: `items[${idx}].unit_price`,
    message: `Line ${idx + 1}: Unit Price must be 0 or more.`,
  });
}

  const receivedComplete = Boolean(it.received_complete);
  const backOrdered = Boolean(it.back_ordered);

  if (receivedComplete && backOrdered) {
    return res.status(400).json({
      success: 0,
      field: `items[${idx}]`,
      message: `Line ${idx + 1}: Item cannot be both fully received and back ordered.`,
    });
  }
}

    // ✅ Transaction: PO + items together
    const result = await db.transaction(async (trx) => {
      const inserted = await trx("purchase_orders")
        .insert({
          psr_po_number: psrPo,
          order_date: orderDate,
          expected_delivery_date: normalizeDate(body.expected_delivery_date),

          // ✅ validated above
          created_by: createdBy,
          vendor_id: vendorId,

                   payment_method: body.payment_method || null,
          payment_terms: body.payment_terms || null,
          currency: body.currency || "USD",
          remarks: body.remarks || null,
          received_by: body.received_by || null,
          received_on: normalizeDate(body.received_on),

          // ✅ payment summary fields
          amount_paid: Number(body.amount_paid ?? 0),
          payment_reference: body.payment_reference || null,
          credit_applied: Number(body.credit_applied ?? 0),
          payment_notes: body.payment_notes || null,

          tax_percent: Number(body.tax_percent ?? 0),
          shipping_charges: Number(body.shipping_charges ?? 0),
          subtotal: Number(body.subtotal ?? 0),
          tax_amount: Number(body.tax_amount ?? 0),
          grand_total: Number(body.grand_total ?? 0),
          status: body.status || "Draft",
          date_paid: null,
        })
        .returning(["id", "psr_po_number"]);

      const poId = inserted[0].id;

      // ✅ Insert items (we already validated)
    const rows = items.map((i) => ({
  po_id: poId,
  part_id: Number(i.part_id),
  line_no: Number(i.line_no),
  quantity: String(i.quantity),
  unit_price: String(i.unit_price),
  total_price: String(i.total_price),
  description: i.description || "",
  received_complete: Boolean(i.received_complete),
  back_ordered: Boolean(i.back_ordered),
}));
      await trx("purchase_order_items").insert(rows);

      return {
        poId,
        psr_po_number: inserted[0].psr_po_number,
        order_date: orderDate,
      };
    });

    return res.json({
      success: 1,
      po_id: result.poId,
      psr_po_number: result.psr_po_number,
      order_date: result.order_date,
    });
  } catch (err) {
    console.error("❌ CREATE PO error:", err);
    return res.status(500).json({ success: 0, message: "Failed to create PO" });
  }
});

//
// =====================================================
// ✅ UPDATE PO
// PUT /api/purchase_orders/:id
// - Updates purchase_orders row
// - Replaces items safely
// - If status becomes Paid, sets date_paid to system date
// =====================================================
//
router.put("/:id", requirePermission("edit_purchase_orders"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ success: 0, message: "Invalid PO id" });
  }

  try {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];

    const existing = await db("purchase_orders").where({ id }).first();
    if (!existing) {
      return res.status(404).json({ success: 0, message: "PO not found" });
    }

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx] || {};

      const partId = Number(it.part_id);
      if (!partId || Number.isNaN(partId)) {
        return res.status(400).json({
          success: 0,
          field: `items[${idx}].part_id`,
          message: `Line ${idx + 1}: Part is required.`,
        });
      }

      const qty = Number(it.quantity);
      if (!qty || Number.isNaN(qty) || qty <= 0) {
        return res.status(400).json({
          success: 0,
          field: `items[${idx}].quantity`,
          message: `Line ${idx + 1}: Quantity must be greater than 0.`,
        });
      }

      const unitPriceRaw = it.unit_price;
const unitPrice = Number(unitPriceRaw);

if (
  unitPriceRaw === "" ||
  unitPriceRaw === null ||
  unitPriceRaw === undefined ||
  Number.isNaN(unitPrice) ||
  unitPrice < 0
) {
  return res.status(400).json({
    success: 0,
    field: `items[${idx}].unit_price`,
    message: `Line ${idx + 1}: Unit Price must be 0 or more.`,
  });
}
      const receivedComplete = Boolean(it.received_complete);
      const backOrdered = Boolean(it.back_ordered);

      if (receivedComplete && backOrdered) {
        return res.status(400).json({
          success: 0,
          field: `items[${idx}]`,
          message: `Line ${idx + 1}: Item cannot be both fully received and back ordered.`,
        });
      }
    }

    const isBecomingPaid = body.status === "Paid" && existing.status !== "Paid";
    const datePaidToSet = isBecomingPaid ? systemDateYmd() : existing.date_paid;

    await db.transaction(async (trx) => {
      await trx("purchase_orders")
        .where({ id })
        .update({
          expected_delivery_date: normalizeDate(body.expected_delivery_date),
          created_by: body.created_by ?? existing.created_by,
          vendor_id: body.vendor_id ? Number(body.vendor_id) : existing.vendor_id,
          payment_method: body.payment_method ?? existing.payment_method,
          payment_terms: body.payment_terms ?? existing.payment_terms,

          amount_paid: Number(body.amount_paid ?? existing.amount_paid ?? 0),
          payment_reference: body.payment_reference ?? existing.payment_reference,
          credit_applied: Number(body.credit_applied ?? existing.credit_applied ?? 0),
          payment_notes: body.payment_notes ?? existing.payment_notes,

          currency: body.currency ?? existing.currency,
          remarks: body.remarks ?? existing.remarks,
          received_by: body.received_by ?? existing.received_by,
          received_on: normalizeDate(body.received_on) ?? existing.received_on,
          tax_percent: Number(body.tax_percent ?? existing.tax_percent ?? 0),
          shipping_charges: Number(body.shipping_charges ?? existing.shipping_charges ?? 0),
          subtotal: Number(body.subtotal ?? existing.subtotal ?? 0),
          tax_amount: Number(body.tax_amount ?? existing.tax_amount ?? 0),
          grand_total: Number(body.grand_total ?? existing.grand_total ?? 0),
          status: body.status ?? existing.status,
          date_paid: datePaidToSet,
        });

      await trx("purchase_order_items").where({ po_id: id }).del();

      if (items.length > 0) {
        const rows = items.map((i, idx) => {
  const qty = Number(i.quantity || 0);
  const receivedQty = Number(i.received_quantity || 0);
  const boQty = Number(i.backorder_quantity || 0);

  // VALIDATION
  if (receivedQty < 0 || boQty < 0) {
    throw new Error("Received/BO quantity cannot be negative");
  }

  if (receivedQty + boQty > qty) {
    throw new Error(
      `Invalid quantities: received (${receivedQty}) + BO (${boQty}) exceeds ordered (${qty})`
    );
  }

  // DERIVED FLAGS
  const receivedComplete = receivedQty >= qty;
  const backOrdered = boQty > 0;

  return {
    po_id: id,
    line_no: idx + 1,
    part_id: i.part_id,
    quantity: qty,
    unit_price: i.unit_price,
    total_price: i.total_price,

    // NEW FIELDS
    received_quantity: receivedQty,
    backorder_quantity: boQty,

    // EXISTING FLAGS (AUTO DERIVED)
    received_complete: receivedComplete,
    back_ordered: backOrdered,
  };
});

        await trx("purchase_order_items").insert(rows);
      }
    });

    return res.json({
      success: 1,
      message: "PO updated successfully",
      date_paid: datePaidToSet,
    });
  } catch (err) {
    console.error("❌ UPDATE PO error:", err);
return res.status(400).json({
  success: 0,
  message: err.message || "Failed to update PO"
});
  }
});

//
// =====================================================
// ✅ UPLOAD PO ATTACHMENTS
// POST /api/purchase_orders/:id/upload
//
// IMPORTANT FIXES:
//  1) Your DB has NOT NULL column: stored_filename
//     -> must insert stored_filename = f.filename
//  2) Some DBs have uploaded_at (default now). We do not insert uploaded_on.
// =====================================================
//
router.post(
  "/:id/upload",
  requirePermission("edit_purchase_orders"),
  resolvePoUploadMiddleware(),
  async (req, res) => {
  try {
    const poId = Number(req.params.id);
    if (!Number.isInteger(poId)) {
      return res.status(400).json({ success: 0, message: "Invalid PO id" });
    }

    // ✅ Confirm PO exists
    const po = await db("purchase_orders").where({ id: poId }).first();
    if (!po) {
      return res.status(404).json({ success: 0, message: "PO not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: 0, message: "No files uploaded" });
    }

    // ✅ Build DB rows matching your schema
    const rowsToInsert = req.files.map((f) => ({
      po_id: poId,
      original_filename: f.originalname,
      stored_filename: f.filename, // ✅ REQUIRED (NOT NULL)
      mime_type: f.mimetype,
      size_bytes: f.size,
      filepath: `/uploads/po-attachments/${f.filename}`,
    }));

    // ✅ Normal path: save metadata to DB
    try {
      const inserted = await db("purchase_order_files")
        .insert(rowsToInsert)
        .returning([
          "id",
          "po_id",
          "original_filename",
          "stored_filename",
          "filepath",
          "mime_type",
          "size_bytes",
          "uploaded_at",
        ]);

      return res.json({ success: 1, files: inserted });
    } catch (dbErr) {
      console.error("⚠️ Upload DB insert failed (fallback returning files):", dbErr);

      const fallbackFiles = rowsToInsert.map((r, idx) => ({
        id: `tmp-${Date.now()}-${idx}`,
        po_id: r.po_id,
        original_filename: r.original_filename,
        stored_filename: r.stored_filename,
        filepath: r.filepath,
        mime_type: r.mime_type,
        size_bytes: r.size_bytes,
      }));

      return res.json({
        success: 1,
        warning:
          "Files uploaded but metadata not saved to DB (schema mismatch / missing table / constraints).",
        files: fallbackFiles,
      });
    }
  } catch (err) {
    console.error("❌ UPLOAD error:", err);
    return res
      .status(500)
      .json({ success: 0, message: "Failed to upload attachments" });
  }
});

//
// =====================================================
// ✅ DELETE PO
// DELETE /api/purchase_orders/:id
// =====================================================
//
router.delete("/:id", requirePermission("delete_purchase_orders"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ success: 0, message: "Invalid PO id" });
  }

  try {
    const existing = await db("purchase_orders").where({ id }).first();
    if (!existing) {
      return res.status(404).json({ success: 0, message: "PO not found" });
    }

    await db.transaction(async (trx) => {
      await trx("purchase_order_files")
        .where({ po_id: id })
        .del()
        .catch(() => {});

      await trx("purchase_order_items").where({ po_id: id }).del();
      await trx("purchase_orders").where({ id }).del();
    });

    return res.json({ success: 1, message: "PO deleted successfully" });
  } catch (err) {
    console.error("❌ DELETE PO error:", err);
    return res.status(500).json({ success: 0, message: "Failed to delete PO" });
  }
});


//
// =====================================================
// ✅ GET PO DETAILS (includes items + files)
// GET /api/purchase_orders/:id
// =====================================================
//x`
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ success: 0 });
  }

  const po = await db("purchase_orders as po")
    .leftJoin("vendors as v", "po.vendor_id", "v.vendor_id")
    .select("po.*", "v.vendor_name")
    .where("po.id", id)
    .first();

  if (!po) return res.status(404).json({ success: 0 });

  const items = await db("purchase_order_items").where("po_id", id).orderBy("line_no");

  let files = [];
  try {
    files = await db("purchase_order_files").where("po_id", id).orderBy("id", "desc");
  } catch (e) {
    files = [];
  }

  res.json({ success: 1, data: { ...po, items, files } });
});

export default router;