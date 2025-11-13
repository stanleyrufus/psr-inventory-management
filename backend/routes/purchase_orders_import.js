import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import { db } from "../db.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const toString = (v) => (v == null ? "" : String(v).trim());
const toNumber = (v) => (v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v));

const excelDate = (val) => {
  if (!val) return null;
  if (typeof val === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + val * 86400000);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const normalizeName = (s) =>
  toString(s)
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(inc|ltd|llc|co|company|corp|corporation)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: 0, message: "file missing" });

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

    const grouped = {};
    sheet.forEach((r) => {
      const po = toString(r.OrderNumber);
      if (!po) return;
      if (!grouped[po]) grouped[po] = [];
      grouped[po].push(r);
    });

    let created = 0,
      updated = 0,
      skipped = 0;
    let vendorAuto = 0,
      partAuto = 0;
    let existingPOs = 0;
    const vendorAutoList = [];
    const partAutoList = [];
    const errors = [];

    const allVendors = await db("vendors").select("vendor_id", "vendor_name");
    const vendorIndex = allVendors.map((v) => ({
      vendor_id: v.vendor_id,
      vendor_name: v.vendor_name,
      norm: normalizeName(v.vendor_name),
    }));

    const findVendor = async (name) => {
      const n = normalizeName(name);
      const eq = vendorIndex.find((v) => v.norm === n);
      if (eq) return eq;
      const contains = vendorIndex.find((v) => v.norm.includes(n) || n.includes(v.norm));
      return contains || null;
    };

    for (const [poNumber, rows] of Object.entries(grouped)) {
      const first = rows[0];
      const vendorName = toString(first.VendorName);
      const orderDate = excelDate(first.OrderDate);

      let vendor = await findVendor(vendorName);

      const partNos = [...new Set(rows.map((r) => toString(r.ItemName)).filter(Boolean))];

      const existingParts =
        partNos.length > 0
          ? await db("inventory").whereIn(
              db.raw("LOWER(part_number)"),
              partNos.map((p) => p.toLowerCase())
            )
          : [];

      const partMap = new Map();
      existingParts.forEach((p) => partMap.set(p.part_number.toLowerCase(), p));

      const hasVendor = !!vendorName;
      const hasPartsInSheet = partNos.length > 0;
      const hasAnyPartsInDB = existingParts.length > 0;

      if (hasVendor && !hasPartsInSheet) {
        if (!vendor) {
          const inserted = await db("vendors")
            .insert({
              vendor_name: vendorName,
              created_on: orderDate || db.fn.now(),
              updated_on: db.fn.now(),
            })
            .returning(["vendor_id", "vendor_name"]);
          vendor = inserted[0];
          vendorAuto++;
          vendorAutoList.push(vendorName);
        }
        skipped++;
        errors.push({
          OrderNumber: poNumber,
          Reason: "No items — vendor ensured only (no PO created)",
        });
        continue;
      }

      if (!vendor && hasPartsInSheet) {
        const inserted = await db("vendors")
          .insert({
            vendor_name: vendorName || "Unknown",
            created_on: orderDate || db.fn.now(),
            updated_on: db.fn.now(),
          })
          .returning(["vendor_id", "vendor_name"]);
        vendor = inserted[0];
        vendorAuto++;
        vendorAutoList.push(vendorName || "Unknown");
      }

      if (hasPartsInSheet && !hasAnyPartsInDB) {
        for (const r of rows) {
          const pn = toString(r.ItemName);
          if (!pn) continue;
          const desc = toString(r.ItemDescription);

          if (!partMap.get(pn.toLowerCase())) {
            await db("inventory").insert({
              part_number: pn,
              part_name: desc || pn,
              description: desc,
              last_vendor_id: vendor?.vendor_id || null,
              last_vendor_name: vendor?.vendor_name || "",
              last_po_number: poNumber,
              last_unit_price: toNumber(r.ItemUnitPrice),
              last_po_date: orderDate,
              created_on: orderDate || db.fn.now(),
              updated_on: db.fn.now(),
            });
            partAuto++;
            partAutoList.push(pn);
          }
        }
        skipped++;
        errors.push({ OrderNumber: poNumber, Reason: "Parts created only — no PO created" });
        continue;
      }

      if (!hasPartsInSheet) {
        skipped++;
        errors.push({ OrderNumber: poNumber, Reason: "No line items" });
        continue;
      }

      const existingPO = await db("purchase_orders")
        .where({ psr_po_number: poNumber })
        .first();

      let poId;
      if (existingPO) {
        existingPOs++;
        await db("purchase_order_items").where({ po_id: existingPO.id }).del();
        await db("purchase_orders")
          .where({ id: existingPO.id })
          .update({
            vendor_id: vendor?.vendor_id || existingPO.vendor_id,
            order_date: orderDate,
            updated_at: db.fn.now(),
          });
        updated++;
        poId = existingPO.id;
      } else {
        const insertedPO = await db("purchase_orders")
          .insert({
            psr_po_number: poNumber,
            vendor_id: vendor?.vendor_id || null,
            order_date: orderDate,
            created_at: orderDate || db.fn.now(),
            updated_at: db.fn.now(),
            status: "Imported",
          })
          .returning(["id"]);
        poId = insertedPO[0].id;
        created++;
      }

      const items = rows
        .filter((r) => toString(r.ItemName))
        .map((r, idx) => {
          const pn = toString(r.ItemName);
          const p = existingParts.find((x) => x.part_number.toLowerCase() === pn.toLowerCase());
          return {
            po_id: poId,
            line_no: idx + 1,
            part_id: p?.part_id || null,
            quantity: toNumber(r.ItemQuantity),
            unit_price: toNumber(r.ItemUnitPrice),
            total_price: toNumber(r.ItemQuantity) * toNumber(r.ItemUnitPrice),
          };
        });

      if (items.length > 0) {
        await db("purchase_order_items").insert(items);
      } else {
        skipped++;
        errors.push({
          OrderNumber: poNumber,
          Reason: "No valid items — PO header present",
        });
      }

      // ✅ NEW: CALCULATE TOTALS FOR IMPORTED POs
      const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);
      const tax_percent = 8; // default same as frontend
      const tax_amount = (subtotal * tax_percent) / 100;
      const shipping_charges = 0;
      const grand_total = subtotal + tax_amount + shipping_charges;

      await db("purchase_orders")
        .where({ id: poId })
        .update({
          subtotal,
          tax_percent,
          tax_amount,
          shipping_charges,
          grand_total,
        });
      // ✅ END FIX
    }

    res.json({
      success: 1,
      created,
      updated,
      skipped,
      summary: {
        totalRows: sheet.length,
        uniquePOs: Object.keys(grouped).length,
        insertedPOs: created,
        overwrittenPOs: updated,
        skippedPOs: skipped,
        existingPOs,
        vendorAutoCreated: { count: vendorAuto, names: vendorAutoList },
        partAutoCreated: { count: partAuto, names: partAutoList },
      },
      errors,
    });
  } catch (err) {
    console.error("❌ Import error:", err);
    res.status(500).json({ success: 0, error: err.message });
  }
});

export default router;
