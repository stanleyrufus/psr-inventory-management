import express from "express";
import { db } from "../db.js";

const router = express.Router();

/* vendor-parts-latest route FIRST */
router.get("/vendor-parts-latest", async (req, res) => {
  try {
    const vendorId = req.query.vendor_id ? Number(req.query.vendor_id) : null;

    const sql = `
      WITH ranked AS (
        SELECT
          po.vendor_id,
          v.vendor_name,
          poi.part_id,
          i.part_number,
          i.part_name,
          i.description,
          po.id AS po_id,
          po.psr_po_number,
          po.order_date,
          po.status,
          poi.quantity,
          poi.unit_price,
          poi.total_price,
          ROW_NUMBER() OVER (
            PARTITION BY po.vendor_id, poi.part_id
            ORDER BY po.order_date DESC, po.id DESC, poi.line_no DESC
          ) AS rn
        FROM purchase_orders po
        JOIN purchase_order_items poi ON poi.po_id = po.id
        LEFT JOIN inventory i ON i.part_id = poi.part_id
        LEFT JOIN vendors v ON v.vendor_id = po.vendor_id
        WHERE (?::int IS NULL OR po.vendor_id = ?::int)
      )
      SELECT
        vendor_id,
        vendor_name,
        part_id,
        part_number,
        part_name,
        description,
        po_id,
        psr_po_number,
        order_date,
        status,
        quantity,
        unit_price,
        total_price
      FROM ranked
      WHERE rn = 1
      ORDER BY vendor_name ASC, part_name ASC, part_number ASC;
    `;

    const result = await db.raw(sql, [vendorId, vendorId]);

    return res.json({
      success: 1,
      data: result.rows || [],
    });
  } catch (err) {
    console.error("❌ vendor-parts-latest report error:", err);
    return res.status(500).json({
      success: 0,
      message: "Failed to load vendor parts latest report",
    });
  }
});

/* existing report route */
router.get("/", async (req, res) => {
  try {
    const { from, to, vendor_id, status, search } = req.query;

    const q = db("purchase_orders as po")
      .leftJoin("vendors as v", "po.vendor_id", "v.vendor_id")
      .select(
        "po.id as po_id",
        "po.psr_po_number as po_number",
        "po.vendor_id",
        "v.vendor_name",
        "po.order_date",
        "po.expected_delivery_date as expected_date",
        "po.status",
        "po.remarks as notes",
        db.raw(
          `(select COALESCE(SUM(i.quantity * COALESCE(i.unit_price,0)),0)
            from purchase_order_items i
            where i.po_id = po.id) as total_amount`
        ),
        db.raw(
          `(select COALESCE(json_agg(json_build_object(
              'item_id', i.id,
              'part_id', i.part_id,
              'part_number', inv.part_number,
              'part_name', COALESCE(inv.part_name,''),
              'description', COALESCE(i.description, inv.description, ''),
              'quantity', i.quantity,
              'unit_price', COALESCE(i.unit_price,0),
              'line_total', COALESCE(i.quantity * COALESCE(i.unit_price,0),0)
            ) order by i.id), '[]'::json)
           from purchase_order_items i
           left join inventory inv on inv.part_id = i.part_id
           where i.po_id = po.id) as items`
        )
      );

    if (from) q.where("po.order_date", ">=", from);
    if (to) q.where("po.order_date", "<=", to);
    if (vendor_id) q.where("po.vendor_id", vendor_id);
    if (status) q.where("po.status", status);

    if (search) {
      const s = `%${search}%`;
      q.andWhere((builder) => {
        builder
          .whereILike("po.psr_po_number", s)
          .orWhereILike("v.vendor_name", s)
          .orWhereILike("po.remarks", s);
      });
    }

    q.orderBy("po.order_date", "desc").orderBy("po.id", "desc");

    const rows = await q;
    res.json({ success: 1, data: rows });
  } catch (err) {
    console.error("❌ PO report error:", err);
    res.status(500).json({ success: 0, message: "Failed to fetch PO report" });
  }
});

export default router;