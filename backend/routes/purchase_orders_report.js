// backend/routes/purchase_orders_report.js
import express from "express";
import { db } from "../db.js";

const router = express.Router();

/**
 * GET /api/purchase_orders_report
 * Query params: from, to, vendor_id, status, search
 */
router.get("/", async (req, res) => {
  try {
    const { from, to, vendor_id, status, search } = req.query;

    // Base query: PO header + vendor + totals + items (nested)
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
)

    // Filters
    if (from) q.where("po.order_date", ">=", from);
    if (to) q.where("po.order_date", "<=", to);
    if (vendor_id) q.where("po.vendor_id", vendor_id);
    if (status) q.where("po.status", status);

    if (search) {
      const s = `%${search}%`;
      q.andWhere((builder) => {
        builder
          .whereILike("po.po_number", s)
          .orWhereILike("v.vendor_name", s)
          .orWhereILike("po.notes", s);
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
