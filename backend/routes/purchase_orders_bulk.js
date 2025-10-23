// backend/routes/purchase_orders_bulk.js
import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import { db } from "../db.js";


const router = express.Router();
const upload = multer({ dest: "uploads/" });

// --- Bulk Upload Route ---
router.post("/bulk", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // 1️⃣ Parse Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length)
      return res.status(400).json({ success: false, message: "Empty file" });

    // 2️⃣ Group by PO Number
    const grouped = {};
    for (const row of rows) {
      const poNumber = row["PO Number"];
      if (!poNumber) continue;
      if (!grouped[poNumber]) grouped[poNumber] = [];
      grouped[poNumber].push(row);
    }

    let totalPOs = 0;
    let totalItems = 0;

    // 3️⃣ Process each PO group
    for (const [poNumber, items] of Object.entries(grouped)) {
      const first = items[0];
      const supplier = first["Supplier"] || null;
      const orderDate = first["Order Date"]
        ? new Date(first["Order Date"])
        : new Date();

      const { rows: poRows } = await db.query(
        `INSERT INTO purchase_orders 
          (psr_po_number, supplier_name, order_date, shipping_charges, tax_percent, remarks, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'Draft')
         RETURNING id`,
        [
          poNumber,
          supplier,
          orderDate,
          Number(first["Shipping"] || 0),
          Number(first["Tax %"] || 0),
          first["Remarks"] || "",
        ]
      );

      const poId = poRows[0].id;
      totalPOs++;

      // 4️⃣ Insert PO items
      for (const item of items) {
        await db.query(
          `INSERT INTO purchase_order_items (po_id, part_id, quantity, unit_price, total_price)
           VALUES (
             $1,
             (SELECT part_id FROM parts WHERE part_number = $2 LIMIT 1),
             $3, $4, $5
           )`,
          [
            poId,
            item["Part Number"],
            Number(item["Quantity"]),
            Number(item["Unit Price"]),
            Number(item["Quantity"]) * Number(item["Unit Price"]),
          ]
        );
        totalItems++;
      }
    }

    res.json({
      success: true,
      message: `✅ Uploaded ${totalPOs} purchase orders with ${totalItems} items.`,
    });
  } catch (err) {
    console.error("❌ Bulk PO upload error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during bulk upload. See console for details.",
    });
  }
});

export default router;
