// backend/routes/po_import.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db.js";

import { extractPoHybrid } from "../services/poHybridExtractor.js";
import { extractPoWithAzureAi } from "../services/poAzureAiExtractor.js";
import { convertOfficeToPdf } from "../utils/officeToPdf.js";

const router = express.Router();
const IMPORT_FINAL_STATUS = "Placed";
const BUSINESS_TIMEZONE = "America/New_York";

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

const uploadExcel = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const lower = file.originalname.toLowerCase();
    const ok =
      lower.endsWith(".xls") ||
      lower.endsWith(".xlsx") ||
      file.mimetype.includes("spreadsheet") ||
      file.mimetype.includes("excel");
    if (!ok) return cb(new Error("Only Excel files (.xls, .xlsx) are allowed"));
    cb(null, true);
  },
});

/* ---------------- Helpers ---------------- */

function normalizeVendorName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[.,'"-]/g, " ")
    .replace(
      /\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|company)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePoNumberForMatch(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";

  const compact = raw.replace(/\s+/g, "");

  // Reject plain year-like values such as 2026
  if (/^\d{4}$/.test(compact)) {
    return "";
  }

  // 260413-02 -> PO260413-02
  if (/^\d{6}-\d+$/.test(compact)) {
    return `PO${compact}`;
  }

  return compact;
}

function normalizeDateOnly(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    // MM/DD/YYYY
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const mm = String(m[1]).padStart(2, "0");
      const dd = String(m[2]).padStart(2, "0");
      const yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    // ISO-ish datetime string -> keep calendar date part
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (iso) {
      return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }
  }

  // JS Date object -> preserve UTC calendar date
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const yyyy = value.getUTCFullYear();
    const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(value.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function asBusinessTimestamp(trx, dateOnly) {
  if (!dateOnly) return null;
  return trx.raw(
    "((?::date)::timestamp AT TIME ZONE ?)",
    [dateOnly, BUSINESS_TIMEZONE]
  );
}

async function ensureVendor(trx, vendor) {
  if (!vendor?.name) throw new Error("Vendor name missing in extracted document");

  const name = String(vendor.name || "").trim();
  const norm = normalizeVendorName(name);

  let existing = await trx("vendors").where("vendor_name", "ilike", name).first();

  if (!existing) {
    existing = await trx("vendors")
      .whereRaw(
        `
        trim(
          regexp_replace(
            regexp_replace(
              regexp_replace(lower(vendor_name), '[.,''"-]', ' ', 'g'),
              '\\m(inc|incorporated|llc|ltd|limited|corp|corporation|co|company)\\M',
              '',
              'g'
            ),
            '\\s+',
            ' ',
            'g'
          )
        ) = ?
        `,
        [norm]
      )
      .first();
  }

  if (existing) {
    const patch = {};

    const setIfEmpty = (dbCol, newVal) => {
      const cur = existing[dbCol];
      const hasCur =
        cur !== null && cur !== undefined && String(cur).trim() !== "";
      const hasNew =
        newVal !== null && newVal !== undefined && String(newVal).trim() !== "";

      if (!hasCur && hasNew) {
        patch[dbCol] = String(newVal).trim();
      }
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

function isChargeOnlyLine(line) {
  const desc = String(line?.description || "").toLowerCase().trim();
  const partNumber = String(line?.partNumber || "").toLowerCase().trim();
  const partName = String(line?.partName || "").toLowerCase().trim();

  const text = `${partNumber} ${partName} ${desc}`;

  return (
    text.includes("freight") ||
    text.includes("shipping") ||
    text.includes("ship-freight") ||
    text.includes("ups express") ||
    text.includes("ddp")
  );
}

function derivePartNumber(line) {
  const rawPartNumber = String(line?.partNumber || "").trim();
  if (rawPartNumber) return rawPartNumber;

  const desc = String(line?.description || "").trim();
  if (!desc) return "";

  const match = desc.match(
    /\b([A-Z0-9]+(?:[-+][A-Z0-9]+)+|[A-Z]{2,}\d[A-Z0-9-+]*)\b/i
  );

  if (match?.[1]) {
    return match[1].trim().toUpperCase();
  }

  return "";
}

function normalizePartNumber(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

async function ensurePart(trx, line, meta = {}) {
  const pn = derivePartNumber(line);
  if (!pn) throw new Error("Line item missing partNumber");

  const normalizedPn = normalizePartNumber(pn);
  const incomingPartName = String(line.partName || line.description || "").trim();
  const incomingDescription = String(line.description || "").trim();

  const parsedUnitPrice =
    line.unitPrice === null ||
    line.unitPrice === undefined ||
    line.unitPrice === ""
      ? null
      : Number(line.unitPrice);

  const hasValidUnitPrice =
    parsedUnitPrice !== null && !Number.isNaN(parsedUnitPrice);

  let existing = await trx("inventory").where({ part_number: pn }).first();

  if (!existing && normalizedPn) {
    existing = await trx("inventory")
      .whereRaw(
        "regexp_replace(upper(part_number), '[^A-Z0-9]', '', 'g') = ?",
        [normalizedPn]
      )
      .first();
  }

  if (existing) {
    const patch = {};

    if (hasValidUnitPrice) {
      patch.current_unit_price = parsedUnitPrice;
      patch.last_unit_price = parsedUnitPrice;
    }

    const existingPartName = String(existing.part_name || "").trim();
    const existingDescription = String(existing.description || "").trim();

    if (!existingPartName && incomingPartName) {
      patch.part_name = incomingPartName;
    }

    if (!existingDescription && incomingDescription) {
      patch.description = incomingDescription;
    }

    patch.last_po_number = meta.psrPoNumber || null;
    patch.last_vendor_id = meta.vendorId || null;
    patch.last_po_date = meta.orderDate ? String(meta.orderDate) : null;
    patch.updated_at = trx.fn.now();
    patch.updated_on = trx.fn.now();

    await trx("inventory").where({ part_id: existing.part_id }).update(patch);
    return existing.part_id;
  }

  const insertRow = {
    part_number: pn,
    part_name: incomingPartName || "",
    description: incomingDescription || "",
    current_unit_price: hasValidUnitPrice ? parsedUnitPrice : 0,
    last_unit_price: hasValidUnitPrice ? parsedUnitPrice : 0,
    last_po_number: meta.psrPoNumber || null,
    last_vendor_id: meta.vendorId || null,
    last_po_date: meta.orderDate ? String(meta.orderDate) : null,
    status: "Active",
  };

  const [inserted] = await trx("inventory")
    .insert(insertRow)
    .returning(["part_id"]);

  return inserted.part_id;
}


function sanitizeVendorContact(extracted) {
  if (!extracted) return extracted;

  if (extracted?.vendor?.contactName) {
    const cn = String(extracted.vendor.contactName).trim();
    const m = cn.match(/\battn\b[:\-]?\s*(.+)$/i);
    if (m?.[1]) {
      extracted.orderedBy = extracted.orderedBy || m[1].trim();
      extracted.vendor.contactName = null;
    }
  }

  if (String(extracted?.vendor?.name || "").toLowerCase().includes("mcmaster")) {
    const cn = String(extracted?.vendor?.contactName || "").trim();
    if (cn && cn.split(/\s+/).length >= 2) {
      extracted.orderedBy = extracted.orderedBy || cn;
      extracted.vendor.contactName = null;
    }
  }

  if (String(extracted?.vendor?.name || "").toLowerCase().includes("quality")) {
    const cnLower = String(extracted?.vendor?.contactName || "").toLowerCase();
    if (cnLower.includes("shiney") || cnLower.includes("ramnarain")) {
      extracted.orderedBy = extracted.orderedBy || extracted.vendor.contactName;
      extracted.vendor.contactName = null;
    }
  }

  return extracted;
}

async function processImportedPo({
  trx,
  extracted,
  uploaderName,
  originalFilename,
  originalFilePath,
  originalMimeType,
  originalSize,
  extraFileToAttach = null,
}) {
  if (!extracted || !extracted.psrPoNumber) {
    throw new Error("Invalid extraction: PO number missing");
  }

  sanitizeVendorContact(extracted);

  const normalizedPoNumber = normalizePoNumberForMatch(extracted.psrPoNumber);

// 🔍 ADD THESE TWO LINES HERE
console.log("🟨 Extracted raw PO:", extracted?.psrPoNumber);
console.log("🟨 Normalized PO:", normalizedPoNumber);

if (!normalizedPoNumber) {
  throw new Error("Invalid extraction: PO number missing or malformed");
}
  const normalizedOrderDate = normalizeDateOnly(extracted.orderDate);
  const normalizedExpectedDeliveryDate = normalizeDateOnly(
    extracted.expectedDeliveryDate
  );

  const existing = normalizedPoNumber
    ? await trx("purchase_orders")
        .whereRaw("upper(psr_po_number) = ?", [normalizedPoNumber])
        .first()
    : null;

  let targetPoId = null;
  let mode = "INSERT_NEW";

  if (existing) {
    if (String(existing.status || "").toLowerCase() === "reserved") {
      targetPoId = existing.id;
      mode = "UPDATE_RESERVED";
    } else {
      throw new Error(
        `Duplicate PO number ${normalizedPoNumber} already exists (PO ID: ${existing.id}, status: ${existing.status}).`
      );
    }
  }

  const vendorId = await ensureVendor(trx, extracted.vendor);

const lineItems = [];
for (const li of extracted.items || []) {
  if (isChargeOnlyLine(li)) {
    continue;
  }

  const normalizedLi = {
    ...li,
    partNumber: derivePartNumber(li),
  };

  const partId = await ensurePart(trx, normalizedLi, {
    psrPoNumber: normalizedPoNumber,
    vendorId,
    orderDate: normalizedOrderDate || null,
  });

  lineItems.push({ ...normalizedLi, part_id: partId });
}

  if (!lineItems.length) {
    throw new Error("Could not extract line items from imported document");
  }

  let poRow;

  if (mode === "UPDATE_RESERVED") {
    const updated = await trx("purchase_orders")
      .where({ id: targetPoId })
      .update({
        order_date: normalizedOrderDate
          ? asBusinessTimestamp(trx, normalizedOrderDate)
          : existing.order_date,
        expected_delivery_date: normalizedExpectedDeliveryDate
          ? asBusinessTimestamp(trx, normalizedExpectedDeliveryDate)
          : null,
        created_by: existing.created_by || extracted.orderedBy || uploaderName,
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
        updated_at: trx.fn.now(),
      })
      .returning(["id", "psr_po_number"]);

    poRow = updated[0];
    await trx("purchase_order_items").where({ po_id: targetPoId }).del();
  } else {
    const inserted = await trx("purchase_orders")
      .insert({
        psr_po_number: normalizedPoNumber,
        order_date: normalizedOrderDate
          ? asBusinessTimestamp(trx, normalizedOrderDate)
          : null,
        expected_delivery_date: normalizedExpectedDeliveryDate
          ? asBusinessTimestamp(trx, normalizedExpectedDeliveryDate)
          : null,
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

  const storedFilename = path.basename(originalFilePath);
  const relativePath = path.join(IMPORT_SUBFOLDER, storedFilename).replace(/\\/g, "/");

  await trx("purchase_order_files").insert({
    po_id: poId,
    original_filename: originalFilename,
    stored_filename: storedFilename,
    filepath: `/uploads/${relativePath}`,
    mime_type: originalMimeType,
    size_bytes: originalSize,
  });

  if (extraFileToAttach) {
    const extraStoredFilename = path.basename(extraFileToAttach.filePath);
    const extraRelativePath = path
      .join(IMPORT_SUBFOLDER, extraStoredFilename)
      .replace(/\\/g, "/");

    await trx("purchase_order_files").insert({
      po_id: poId,
      original_filename: extraFileToAttach.originalFilename,
      stored_filename: extraStoredFilename,
      filepath: `/uploads/${extraRelativePath}`,
      mime_type: extraFileToAttach.mimeType,
      size_bytes: extraFileToAttach.sizeBytes,
    });
  }

  return {
    po_id: poId,
    psr_po_number: poRow.psr_po_number,
    filename: originalFilename,
    mode,
  };
}

/* ---------------- Main import endpoints ---------------- */

router.post("/pdf", upload.array("files", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: 0, message: "No PDF files uploaded" });
  }

  const created = [];
  const errors = [];
  const uploaderName = req.user?.name || "PDF Import";
  const trx = await db.transaction();

  try {
    for (const file of req.files) {
      try {
        const extracted = await extractPoHybrid(file.path);

        console.log("RAW orderDate:", extracted?.orderDate);
        console.log("RAW expectedDeliveryDate:", extracted?.expectedDeliveryDate);
        console.log("orderDate typeof:", typeof extracted?.orderDate);
        console.log(
          "expectedDeliveryDate typeof:",
          typeof extracted?.expectedDeliveryDate
        );
        console.log(
          "orderDate instanceof Date:",
          extracted?.orderDate instanceof Date,
          extracted?.orderDate instanceof Date
            ? extracted.orderDate.toISOString()
            : null
        );

        const result = await processImportedPo({
          trx,
          extracted,
          uploaderName,
          originalFilename: file.originalname,
          originalFilePath: file.path,
          originalMimeType: file.mimetype,
          originalSize: file.size,
        });

        created.push(result);
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
        errors.every((e) =>
          String(e.error || "").toLowerCase().includes("duplicate po number")
        );

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

router.post("/excel", uploadExcel.array("files", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: 0, message: "No Excel files uploaded" });
  }

  const created = [];
  const errors = [];
  const uploaderName = req.user?.name || "Excel Import";
  const trx = await db.transaction();

  try {
    for (const file of req.files) {
      try {
        const excelPath = file.path;
        const generatedPdfPath = await convertOfficeToPdf(excelPath);

        const extracted = await extractPoWithAzureAi(generatedPdfPath, {
          pages: 2,
          debug: false,
        });

        console.log("RAW orderDate:", extracted?.orderDate);
        console.log("RAW expectedDeliveryDate:", extracted?.expectedDeliveryDate);
        console.log("orderDate typeof:", typeof extracted?.orderDate);
        console.log(
          "expectedDeliveryDate typeof:",
          typeof extracted?.expectedDeliveryDate
        );
        console.log(
          "orderDate instanceof Date:",
          extracted?.orderDate instanceof Date,
          extracted?.orderDate instanceof Date
            ? extracted.orderDate.toISOString()
            : null
        );

        const result = await processImportedPo({
          trx,
          extracted,
          uploaderName,
          originalFilename: file.originalname,
          originalFilePath: excelPath,
          originalMimeType: file.mimetype,
          originalSize: file.size,
          extraFileToAttach: generatedPdfPath && fs.existsSync(generatedPdfPath)
            ? {
                originalFilename: `${file.originalname}.pdf`,
                filePath: generatedPdfPath,
                mimeType: "application/pdf",
                sizeBytes: fs.statSync(generatedPdfPath).size,
              }
            : null,
        });

        created.push(result);
      } catch (err) {
        console.error("❌ Excel import failed for", file.originalname, err);
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
        errors.every((e) =>
          String(e.error || "").toLowerCase().includes("duplicate po number")
        );

      return res.status(allDup ? 409 : 400).json({
        success: 0,
        message: allDup
          ? "All uploaded Excel files were duplicates. No new POs created."
          : "No POs were created.",
        errors,
      });
    }

    await trx.commit();
    return res.json({ success: 1, created, errors });
  } catch (err) {
    await trx.rollback();
    console.error("❌ Excel import fatal error:", err);
    return res.status(500).json({
      success: 0,
      message: "Excel import failed",
      error: err.message,
    });
  }
});

export default router;