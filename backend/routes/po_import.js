// backend/routes/po_import.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db.js";
import { extractPoHybrid } from "../services/poHybridExtractor.js";

const router = express.Router();
const IMPORT_FINAL_STATUS = "Placed";


/* ---------------- Upload config ---------------- */

const UPLOADS_ROOT =
  process.env.UPLOADS_ROOT || path.join(process.cwd(), "uploads");

const IMPORT_SUBFOLDER = "po-import";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(UPLOADS_ROOT, IMPORT_SUBFOLDER);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const ts = Date.now();
    cb(null, `${ts}_${safe}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const lower = file.originalname.toLowerCase();
    if (!file.mimetype.includes("pdf") && !lower.endsWith(".pdf")) {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

/* ---------------- Helpers: ensure vendor & part ---------------- */

function normalizeVendorName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\.\,\'\"\-]/g, " ")
    .replace(/\b(inc|llc|l\.l\.c|co|company|corp|corporation|ltd|limited)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function ensureVendor(trx, vendor) {
  if (!vendor?.name) throw new Error("Vendor name missing in extracted PDF");

  const name = vendor.name.trim();
  const norm = normalizeVendorName(name);

  // ✅ 1) Try exact-ish match first (keeps old behavior)
  let existing = await trx("vendors").where("vendor_name", "ilike", name).first();

  // ✅ 2) If not found, try normalized match (punctuation/suffix safe)
  if (!existing) {
    existing = await trx("vendors")
      .whereRaw(
        `
        regexp_replace(
          regexp_replace(lower(vendor_name), '[^a-z0-9 ]', '', 'g'),
          '\\s+', ' ', 'g'
        ) = ?
        `,
        [norm]
      )
      .first();
  }

  if (existing) {
    // ✅ Update missing vendor fields (fill blanks only; do NOT overwrite existing values)
    const patch = {};

    const setIfEmpty = (dbCol, newVal) => {
      const cur = existing[dbCol];
      const hasCur = cur !== null && cur !== undefined && String(cur).trim() !== "";
      const hasNew = newVal !== null && newVal !== undefined && String(newVal).trim() !== "";
      if (!hasCur && hasNew) patch[dbCol] = String(newVal).trim();
    };

    setIfEmpty("contact_name", vendor.contactName);
    setIfEmpty("email", vendor.email);
    setIfEmpty("phone", vendor.phone);
    setIfEmpty("fax", vendor.fax);
    setIfEmpty("city", vendor.city);
    setIfEmpty("state", vendor.state);
    setIfEmpty("country", vendor.country);

    if (Object.keys(patch).length > 0) {
      await trx("vendors").where({ vendor_id: existing.vendor_id }).update(patch);
    }

    return existing.vendor_id;
  }

  const [inserted] = await trx("vendors")
    .insert({
      vendor_name: name,
      contact_name: vendor.contactName || null,
      email: vendor.email || null,
      phone: vendor.phone || null,
      fax: vendor.fax || null,
      city: vendor.city || null,
      state: vendor.state || null,
      country: vendor.country || null,
      is_active: true,
    })
    .returning(["vendor_id"]);

  return inserted.vendor_id;
}

async function ensurePart(trx, line) {
  if (!line.partNumber) throw new Error("Line item missing partNumber");

  const pn = line.partNumber.trim();

  const existing = await trx("inventory").where({ part_number: pn }).first();
  if (existing) return existing.part_id;

  const [inserted] = await trx("inventory")
    .insert({
      part_number: pn,
      part_name: line.partName || line.description || "",
      description: line.description || "",
      current_unit_price: line.unitPrice ?? 0,
      status: "Active",
    })
    .returning(["part_id"]);

  return inserted.part_id;
}

/* ---------------- Main import endpoint ---------------- */

router.post("/pdf", upload.array("files", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: 0, message: "No PDF files uploaded" });
  }

  const created = [];
  const errors = [];

  // If you have auth middleware, use real user; else default
  const uploaderName = req.user?.name || "PDF Import";

  const trx = await db.transaction();

  try {
    for (const file of req.files) {
      try {
        const filePath = file.path; // multer gives full saved path
        const extracted = await extractPoHybrid(filePath);

        console.log("✅ Hybrid extraction source:", extracted?.extractionSource);
        console.log("✅ Hybrid PO:", extracted?.psrPoNumber);

        // ✅ MUST HAVE PO#
        if (!extracted?.psrPoNumber) {
          throw new Error("Could not detect PO number from PDF");
        }

      // ✅ Check existing PO by PO# (Reserved-aware)
const existing = await trx("purchase_orders")
  .where({ psr_po_number: extracted.psrPoNumber })
  .first();

let targetPoId = null;
let mode = "INSERT_NEW"; // for response/debug

if (existing) {
  // If it's Reserved, we will COMPLETE it (update instead of skip)
  if (String(existing.status || "").toLowerCase() === "reserved") {
    targetPoId = existing.id;
    mode = "UPDATE_RESERVED";
  } else {
    // Real duplicate (already exists and not Reserved)
    errors.push({
      filename: file.originalname,
      error: `Duplicate PO number ${extracted.psrPoNumber} already exists (PO ID: ${existing.id}, status: ${existing.status}). Skipped.`,
    });
    continue;
  }
}


        /* =========================================================
           ✅ PERMANENT FIX BLOCK (ADD HERE)
           - runs BEFORE ensureVendor()
           - prevents vendor contact poisoning
           ========================================================= */

        // 1) Move "Attn: X" out of vendor.contactName -> orderedBy
        if (extracted?.vendor?.contactName) {
          const cn = String(extracted.vendor.contactName).trim();
          const m = cn.match(/\battn\b[:\-]?\s*(.+)$/i);
          if (m?.[1]) {
            extracted.orderedBy = extracted.orderedBy || m[1].trim();
            extracted.vendor.contactName = null;
          }
        }

        // 2) McMaster: any person-like vendor contact is really PSR orderedBy
        if (String(extracted?.vendor?.name || "").toLowerCase().includes("mcmaster")) {
          const cn = String(extracted?.vendor?.contactName || "").trim();
          if (cn && cn.split(/\s+/).length >= 2) {
            extracted.orderedBy = extracted.orderedBy || cn;
            extracted.vendor.contactName = null;
          }
        }

        // 3) Quality: remove known PSR names from vendor contact
        if (String(extracted?.vendor?.name || "").toLowerCase().includes("quality")) {
          const cnLower = String(extracted?.vendor?.contactName || "").toLowerCase();
          if (cnLower.includes("shiney") || cnLower.includes("ramnarain")) {
            extracted.orderedBy = extracted.orderedBy || extracted.vendor.contactName;
            extracted.vendor.contactName = null;
          }
        }

        /* ========================================================= */

        // 1) Ensure vendor exists (safe now)
        const vendorId = await ensureVendor(trx, extracted.vendor);

        // 2) Ensure parts exist and collect items
        const lineItems = [];
        for (const li of extracted.items || []) {
          const partId = await ensurePart(trx, li);
          lineItems.push({ ...li, part_id: partId });
        }

        // ✅ MUST HAVE items
        if (!lineItems.length) {
          throw new Error("Could not extract line items from PDF");
        }

      let poRow;

if (mode === "UPDATE_RESERVED") {
  // ✅ Update reserved PO to become a real PO
  const updated = await trx("purchase_orders")
    .where({ id: targetPoId })
    .update({
      order_date: extracted.orderDate || existing.order_date,
      expected_delivery_date: extracted.expectedDeliveryDate || null,

      // keep whoever reserved it if created_by already exists; else fill
      created_by: existing.created_by || extracted.orderedBy || uploaderName,

      // if vendor differs, we update to extracted vendor (your call; this is safest)
      vendor_id: vendorId,

      payment_terms: extracted.paymentTerms || null,
      currency: extracted.currency || "USD",
      remarks: extracted.remarks || "",
      tax_percent: extracted.taxPercent ?? 0,
      shipping_charges: extracted.shipping ?? 0,
      subtotal: extracted.subtotal ?? 0,
      tax_amount: extracted.taxAmount ?? 0,
      grand_total: extracted.grandTotal ?? 0,

      // ✅ status moves out of Reserved
status: IMPORT_FINAL_STATUS,
      updated_at: trx.fn.now(),
    })
    .returning(["id", "psr_po_number"]);

  poRow = updated[0];

  // ✅ Replace items for this PO (since Reserved PO has none)
  await trx("purchase_order_items").where({ po_id: targetPoId }).del();
} else {
  // ✅ Insert brand new PO (legacy imports will come here)
  const inserted = await trx("purchase_orders")
    .insert({
      psr_po_number: extracted.psrPoNumber,
      order_date: extracted.orderDate,
      expected_delivery_date: extracted.expectedDeliveryDate,
      created_by: extracted.orderedBy || uploaderName,
      vendor_id: vendorId,
      payment_terms: extracted.paymentTerms || null,
      currency: extracted.currency || "USD",
      remarks: extracted.remarks || "",
      tax_percent: extracted.taxPercent ?? 0,
      shipping_charges: extracted.shipping ?? 0,
      subtotal: extracted.subtotal ?? 0,
      tax_amount: extracted.taxAmount ?? 0,
      grand_total: extracted.grandTotal ?? 0,
status: IMPORT_FINAL_STATUS,
    })
    .returning(["id", "psr_po_number"]);

  poRow = inserted[0];
}

const poId = poRow.id;


        // 4) Insert PO items
        const itemsToInsert = lineItems.map((li, idx) => ({
          po_id: poId,
          line_no: idx + 1,
          part_id: li.part_id,
          quantity: String(li.quantity ?? 0),
          unit_price: String(li.unitPrice ?? 0),
          total_price: String(
            li.totalPrice ?? (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0)
          ),
          description: li.description || "",
        }));

        await trx("purchase_order_items").insert(itemsToInsert);

        // 5) Attach PDF
        const storedFilename = path.basename(file.path);
        const relativePath = path.join(IMPORT_SUBFOLDER, storedFilename).replace(/\\/g, "/");

        await trx("purchase_order_files").insert({
          po_id: poId,
          original_filename: file.originalname,
          stored_filename: storedFilename,
          filepath: `/uploads/${relativePath}`,
          mime_type: file.mimetype,
          size_bytes: file.size,
        });

   created.push({
  po_id: poId,
  psr_po_number: poRow.psr_po_number,
  filename: file.originalname,
  mode, // ✅ "UPDATE_RESERVED" or "INSERT_NEW"
});

      } catch (err) {
        console.error("❌ PDF import failed for", file.originalname, err);
        errors.push({
          filename: file.originalname,
          error: err.message || "Unknown error",
        });
      }
    }

    if (!created.length) {
      await trx.rollback();

      const allDup =
        errors.length > 0 &&
        errors.every((e) => String(e.error || "").toLowerCase().includes("duplicate po number"));

      return res.status(allDup ? 409 : 400).json({
        success: 0,
        message: allDup
          ? "All uploaded PDFs were duplicates. No new POs created."
          : "No POs were created.",
        errors,
      });
    }

    await trx.commit();
    return res.json({ success: 1, created, errors });
  } catch (err) {
    await trx.rollback();
    console.error("❌ PDF import fatal error:", err);
    return res.status(500).json({
      success: 0,
      message: "PDF import failed",
      error: err.message,
    });
  }
});

export default router;
