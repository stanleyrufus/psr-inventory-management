// GET /api/parts/low-stock → Low stock report
router.get("/low-stock", async (req, res) => {
  try {
    const rows = await db("inventory AS inv")
      .select(
        "inv.part_id",
        "inv.part_number",
        "inv.part_name",
        db.raw(`COALESCE(inv.description, '') AS description`),
        "inv.quantity_on_hand",
        "inv.minimum_stock_level",
        db.raw(`COALESCE(inv.last_vendor_name, '') AS last_vendor_name`)
      )
      // Only meaningful low stock (min > 0 & qty <= min)
      .where("inv.minimum_stock_level", ">", 0)
      .andWhereRaw(`inv.quantity_on_hand <= inv.minimum_stock_level`)
      .andWhere("inv.status", "Active")
      .orderBy([
        { column: "inv.quantity_on_hand", order: "asc" },
        { column: "inv.part_number", order: "asc" }
      ]);

    return res.json({ success: 1, data: rows });
  } catch (error) {
    console.error("❌ Error fetching low stock:", error);
    return res.status(500).json({ success: 0, message: "Error fetching low stock items" });
  }
});



// ✅ Update minimum stock level for a part
router.put("/min-level/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { minimum_stock_level } = req.body;

    if (minimum_stock_level === undefined || minimum_stock_level < 0) {
      return res.status(400).json({ success: 0, message: "Minimum stock level required" });
    }

    const updated = await db("inventory")
      .where("part_id", id)
      .update({ minimum_stock_level })
      .returning(["part_id", "minimum_stock_level"]);

    return res.json({ success: 1, data: updated[0], message: "Minimum level updated" });
  } catch (err) {
    console.error("❌ Error updating min level", err);
    return res.status(500).json({ success: 0, message: "Error updating min level" });
  }
});
