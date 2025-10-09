const express = require('express');
const router = express.Router();
const db = require('../knex');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

// Get all purchase orders
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const orders = await db('purchase_orders')
      .join('products', 'purchase_orders.product_id', 'products.id')
      .select(
        'purchase_orders.id',
        'products.name as product_name',
        'purchase_orders.quantity',
        'purchase_orders.total_price',
        'purchase_orders.purchased_at',
        'purchase_orders.supplier_name'
      );

    res.json({ message: 'Purchase orders list', purchase_orders: orders });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching purchase orders', error: err.message });
  }
});

// Create a new purchase order (admin only)
router.post('/', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  const { product_id, quantity, total_price, supplier_name } = req.body;

  if (!product_id || !quantity || !total_price || !supplier_name) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [order] = await db('purchase_orders')
      .insert({ product_id, quantity, total_price, supplier_name })
      .returning('*');
    res.json({ message: 'Purchase order created', purchase_order: order });
  } catch (err) {
    res.status(500).json({ message: 'Error creating purchase order', error: err.message });
  }
});

// Update purchase order (admin only)
router.put('/:id', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { quantity, total_price, supplier_name } = req.body;

  try {
    const [order] = await db('purchase_orders')
      .where({ id })
      .update({ quantity, total_price, supplier_name })
      .returning('*');

    if (!order) return res.status(404).json({ message: 'Purchase order not found' });
    res.json({ message: 'Purchase order updated', purchase_order: order });
  } catch (err) {
    res.status(500).json({ message: 'Error updating purchase order', error: err.message });
  }
});

// Delete purchase order (admin only)
router.delete('/:id', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await db('purchase_orders').where({ id }).del();
    if (!deleted) return res.status(404).json({ message: 'Purchase order not found' });
    res.json({ message: 'Purchase order deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting purchase order', error: err.message });
  }
});

module.exports = router;
