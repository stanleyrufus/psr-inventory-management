// /routes/inventory.js
const express = require('express');
const router = express.Router();
const db = require('../knex');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');


// GET all inventory items
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const inventory = await db('inventory')
      .join('products', 'inventory.product_id', 'products.id')
      .select(
        'inventory.id',
        'products.name as product_name',
        'inventory.quantity',
        'inventory.location'
      );
    res.json({ message: 'Inventory list', inventory });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching inventory', error: err.message });
  }
});

// POST add inventory item (admin only)
router.post('/', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const { product_id, quantity, location } = req.body;
    const [newItem] = await db('inventory')
      .insert({ product_id, quantity, location })
      .returning('*');
    res.json({ message: 'Inventory item added', inventory: newItem });
  } catch (err) {
    res.status(500).json({ message: 'Error adding inventory', error: err.message });
  }
});

// PUT update inventory item (admin only)
router.put('/:id', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, location } = req.body;
    const updated = await db('inventory')
      .where({ id })
      .update({ quantity, location })
      .returning('*');
    if (!updated.length) return res.status(404).json({ message: 'Inventory item not found' });
    res.json({ message: 'Inventory updated', inventory: updated[0] });
  } catch (err) {
    res.status(500).json({ message: 'Error updating inventory', error: err.message });
  }
});

// DELETE inventory item (admin only)
router.delete('/:id', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db('inventory').where({ id }).del();
    if (!deleted) return res.status(404).json({ message: 'Inventory item not found' });
    res.json({ message: 'Inventory item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting inventory', error: err.message });
  }
});

module.exports = router;
