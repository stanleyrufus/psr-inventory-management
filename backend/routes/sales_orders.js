// /backend/routes/sales_orders.js
const express = require("express");
const router = express.Router();
const db = require("../knex");
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

// Get all sales orders (any logged-in user can view)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const sales = await db("sales_orders").select("*");
    res.json({ message: "Sales orders list", sales });
  } catch (err) {
    res.status(500).json({ message: "Error fetching sales orders", error: err.message });
  }
});

// Create a new sales order (admin only)
router.post('/', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const { customer_name, product_id, quantity, total_price } = req.body;
    if (!customer_name || !product_id || !quantity || !total_price) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [newSale] = await db("sales_orders")
      .insert({ customer_name, product_id, quantity, total_price })
      .returning("*");

    res.json({ message: "Sales order created", sale: newSale });
  } catch (err) {
    res.status(500).json({ message: "Error creating sales order", error: err.message });
  }
});

// Update a sales order (admin only)
router.put('/:id', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, product_id, quantity, total_price } = req.body;

    const [updatedSale] = await db("sales_orders")
      .where({ id })
      .update({ customer_name, product_id, quantity, total_price })
      .returning("*");

    if (!updatedSale) {
      return res.status(404).json({ message: `Sales order ${id} not found` });
    }

    res.json({ message: "Sales order updated", sale: updatedSale });
  } catch (err) {
    res.status(500).json({ message: "Error updating sales order", error: err.message });
  }
});

// Delete a sales order (admin only)
router.delete('/:id', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db("sales_orders").where({ id }).del();
    if (!deleted) {
      return res.status(404).json({ message: `Sales order ${id} not found` });
    }

    res.json({ message: `Sales order ${id} deleted` });
  } catch (err) {
    res.status(500).json({ message: "Error deleting sales order", error: err.message });
  }
});

module.exports = router;
