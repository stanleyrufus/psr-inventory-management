// /routes/inventory.js
const express = require('express');
const router = express.Router();
const db = require('../knex');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

// GET all inventory items
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const inventory = await db('inventory').select(
      'part_id',
      'part_number',
      'part_name',
      'category',
      'description',
      'uom',
      'quantity_on_hand',
      'minimum_stock_level',
      'unit_price',
      'supplier_name',
      'supplier_part_number',
      'location',
      'status',
      'used_in_products',
      'part_image_url',
      'lead_time_days',
      'weight_kg',
      'material',
      'machine_compatibility',
      'last_order_date',
      'remarks',
      'created_at',
      'updated_at'
    );
    res.json({ message: 'Inventory list', parts: inventory });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching inventory', error: err.message });
  }
});

// POST add inventory item (admin only)
router.post('/', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const newItem = await db('inventory')
      .insert(req.body) // pass full object matching new schema
      .returning('*');
    res.json({ message: 'Inventory item added', parts: newItem[0] });
  } catch (err) {
    res.status(500).json({ message: 'Error adding inventory', error: err.message });
  }
});

// PUT update inventory item (admin only)
router.put('/:id', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db('inventory')
      .where({ part_id: id })
      .update(req.body)
      .returning('*');
    if (!updated.length) return res.status(404).json({ message: 'Inventory item not found' });
    res.json({ message: 'Inventory updated', parts: updated[0] });
  } catch (err) {
    res.status(500).json({ message: 'Error updating inventory', error: err.message });
  }
});

// DELETE inventory item (admin only)
router.delete('/:id', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db('inventory').where({ part_id: id }).del();
    if (!deleted) return res.status(404).json({ message: 'Inventory item not found' });
    res.json({ message: 'Inventory item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting inventory', error: err.message });
  }
});

module.exports = router;
