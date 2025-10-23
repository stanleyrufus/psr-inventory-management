const express = require("express");
const router = express.Router();
const db = require("../knex");
const { authenticateJWT, authorizeRole } = require("../middleware/auth");

// Utility to auto-generate sales order number
const generateOrderNumber = () => `SO-${Date.now()}`;

// 🔹 GET all sales orders
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const sales = await db("sales_orders").select("*").orderBy("sales_order_id", "desc");
    res.json({ message: "Sales orders list", sales });
  } catch (err) {
    res.status(500).json({ message: "Error fetching sales orders", error: err.message });
  }
});

// 🔹 POST create new sales order (admin only)
router.post("/", authenticateJWT, authorizeRole("admin"), async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      product_name,
      product_code,
      quantity,
      unit_price,
      delivery_date,
      status,
      remarks
    } = req.body;

    if (!customer_name || !quantity || !unit_price) {
      return res.status(400).json({ message: "Customer name, quantity, and unit price are required" });
    }

    const order_number = generateOrderNumber();

    // ✅ Remove total_amount, let DB compute it automatically
    const [newSale] = await db("sales_orders")
      .insert({
        order_number,
        customer_name,
        customer_email,
        product_name: product_name || null,
        product_code: product_code || null,
        quantity,
        unit_price,
        delivery_date,
        status: status || "Pending",
        remarks
      })
      .returning("*");

    res.json({ message: "Sales order created successfully", sale: newSale });
  } catch (err) {
    res.status(500).json({ message: "Error creating sales order", error: err.message });
  }
});

// 🔹 PUT update a sales order (admin only)
router.put("/:id", authenticateJWT, authorizeRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove total_amount if present in updateData to avoid conflict with generated column
    if (updateData.total_amount) delete updateData.total_amount;

    const [updatedSale] = await db("sales_orders")
      .where({ sales_order_id: id })
      .update(updateData)
      .returning("*");

    if (!updatedSale) {
      return res.status(404).json({ message: `Sales order ${id} not found` });
    }

    res.json({ message: "Sales order updated successfully", sale: updatedSale });
  } catch (err) {
    res.status(500).json({ message: "Error updating sales order", error: err.message });
  }
});

// 🔹 DELETE a sales order (admin only)
router.delete("/:id", authenticateJWT, authorizeRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db("sales_orders").where({ sales_order_id: id }).del();

    if (!deleted) {
      return res.status(404).json({ message: `Sales order ${id} not found` });
    }

    res.json({ message: `Sales order ${id} deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: "Error deleting sales order", error: err.message });
  }
});

module.exports = router;
