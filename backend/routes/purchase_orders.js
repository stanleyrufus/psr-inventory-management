// /routes/purchase_orders.js
const express = require('express');
const router = express.Router();
const db = require('../knex');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

// GET all purchase orders
router.get('/', async (req, res) => {
  try {
    const orders = await db('purchase_orders').select('*');
    res.json({ message: 'Purchase orders list', orders });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching purchase orders', error: err.message });
  }
});

// GET single purchase order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await db('purchase_orders').where({ po_id: id }).first();
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });
    res.json({ message: 'Purchase order details', order });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching purchase order', error: err.message });
  }
});

// POST create new purchase order (admin only)
router.post('/', authorizeRole('admin'), async (req, res) => {
  try {
    const {
      supplier_name,
      supplier_email,
      expected_delivery_date,
      total_amount,
      currency,
      payment_terms,
      shipping_address,
      remarks,
      invoice_file_url,
      pay_order_file_url,
      status
    } = req.body;

    const [newOrder] = await db('purchase_orders')
      .insert({
        supplier_name,
        supplier_email,
        expected_delivery_date,
        total_amount,
        currency,
        payment_terms,
        shipping_address,
        remarks,
        invoice_file_url,
        pay_order_file_url,
        status
      })
      .returning('*');

    res.json({ message: 'Purchase order created', order: newOrder });
  } catch (err) {
    res.status(500).json({ message: 'Error creating purchase order', error: err.message });
  }
});

// PUT update purchase order (admin only)
router.put('/:id', authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await db('purchase_orders')
      .where({ po_id: id })
      .update(updates)
      .returning('*');

    if (!updated.length) return res.status(404).json({ message: 'Purchase order not found' });

    res.json({ message: 'Purchase order updated', order: updated[0] });
  } catch (err) {
    res.status(500).json({ message: 'Error updating purchase order', error: err.message });
  }
});

// DELETE purchase order (admin only)
router.delete('/:id', authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db('purchase_orders').where({ po_id: id }).del();
    if (!deleted) return res.status(404).json({ message: 'Purchase order not found' });
    res.json({ message: 'Purchase order deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting purchase order', error: err.message });
  }
});

module.exports = router;
