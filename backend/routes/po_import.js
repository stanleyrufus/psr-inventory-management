// backend/routes/po_import.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db.js";
import { extractPoFromPdf } from "../services/poPdfExtractor.js";

const router = express.Router();

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

async function ensureVendor(trx, vendor) {
  if (!vendor?.name) {
    throw new Error("Vendor name missing in extracted PDF");
  }

  const name = vendor.name.trim();

  // Try to find existing (case-insensitive)
  const existing = await trx("vendors")
    .where("vendor_name", "ilike", name)
    .first();

  if (existing) return existing.vendor_id || existing.id;

  const [inserted] = await trx("vendors")
    .insert({
      vendor_name: name,
      contact_name: vendor.contactName || null,
      email: vendor.email || null,
      phone: vendor.phone || null,
      city: vendor.city || null,
      state: vendor.state || null,
      country: vendor.country || null,
      is_active: true,
    })
    .returning(["vendor_id", "id"]);

  return inserted.vendor_id || inserted.id;
}

async function ensurePart(trx, line) {
  if (!line.partNumber) {
    throw new Error("Line item missing partNumber");
  }

  const pn = line.partNumber.trim();

  const existing = await trx("inventory")
    .where({ part_number: pn })
    .first();

  if (existing) return existing.part_id || existing.id;

  const [inserted] = await trx("inventory")
    .insert({
      part_number: pn,
      part_name: line.partName || line.description || "",
      description: line.description || "",
      current_unit_price: line.unitPrice ?? 0,
      status: "Active",
    })
    .returning(["part_id", "id"]);

  return inserted.part_id || inserted.id;
}

/* ---------------- Main import endpoint ---------------- */

router.post("/pdf", upload.array("files", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json({ success: 0, message: "No PDF files uploaded" });
  }

  const created = [];
  const errors = [];

  // If you have auth middleware that sets req.user.name, use that.
  const uploaderName = req.user?.name || "PDF Import";

  const trx = await db.transaction();

  try {
    for (const file of req.files) {
      try {
        const extracted = await extractPoFromPdf(file.path);

        // 1) Ensure vendor exists
        const vendorId = await ensureVendor(trx, extracted.vendor);

        // 2) Ensure parts exist and collect items
        const lineItems = [];
        for (const li of extracted.items || []) {
          const partId = await ensurePart(trx, li);
          lineItems.push({ ...li, part_id: partId });
        }

        // 3) Insert PO
        const [poRow] = await trx("purchase_orders")
          .insert({
            psr_po_number: extracted.psrPoNumber,
            order_date: extracted.orderDate,             // history date from PDF
            expected_delivery_date: extracted.expectedDeliveryDate,
            created_by: uploaderName,                    // you can change this default
            vendor_id: vendorId,
            payment_terms: extracted.paymentTerms || null,
            currency: extracted.currency || "USD",
            remarks: extracted.remarks || "",
            tax_percent: extracted.taxPercent ?? 0,
            shipping_charges: extracted.shipping ?? 0,
            subtotal: extracted.subtotal ?? 0,
            tax_amount: extracted.taxAmount ?? 0,
            grand_total: extracted.grandTotal ?? 0,
            status: "Draft",                             // user will edit/review
          })
          .returning(["id", "psr_po_number"]);

        const poId = poRow.id;

        // 4) Insert PO line items
        if (lineItems.length) {
          const itemsToInsert = lineItems.map((li, idx) => ({
            po_id: poId,
            line_no: idx + 1,
            part_id: li.part_id,
            quantity: String(li.quantity ?? 0),
            unit_price: String(li.unitPrice ?? 0),
            total_price: String(
              li.totalPrice ??
                (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0)
            ),
            description: li.description || "",
          }));

          await trx("purchase_order_items").insert(itemsToInsert);
        }

        // 5) Attach the PDF to the PO (PO files table)
        const relativePath = path
          .join(IMPORT_SUBFOLDER, path.basename(file.path))
          .replace(/\\/g, "/");

        await trx("purchase_order_files") // ⚠️ if your table name differs, update here
          .insert({
            po_id: poId,
            original_filename: file.originalname,
            filepath: "/" + relativePath,
            mime_type: file.mimetype,
            size_bytes: file.size,
          });

        created.push({
          po_id: poId,
          psr_po_number: poRow.psr_po_number,
          filename: file.originalname,
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
      return res.status(400).json({
        success: 0,
        message: "All PDF imports failed",
        errors,
      });
    }

    await trx.commit();
    return res.json({
      success: 1,
      created,
      errors,
    });
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
