// /routes/products.js
const express = require('express');
const router = express.Router();
const db = require('../knex');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

// GET all products
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const products = await db('products').select('*');
    res.json({ message: 'Product list', products });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products', error: err.message });
  }
});

// POST create new product (admin only)
router.post('/', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, price } = req.body;
    const [newProduct] = await db('products').insert({ name, price }).returning('*');
    res.json({ message: 'Product created', product: newProduct });
  } catch (err) {
    res.status(500).json({ message: 'Error creating product', error: err.message });
  }
});

// PUT update product by ID (admin only)
router.put('/:id', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body;
    const updated = await db('products').where({ id }).update({ name, price }).returning('*');
    if (!updated.length) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product updated', product: updated[0] });
  } catch (err) {
    res.status(500).json({ message: 'Error updating product', error: err.message });
  }
});

// DELETE product by ID (admin only)
router.delete('/:id', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db('products').where({ id }).del();
    if (!deleted) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting product', error: err.message });
  }
});

module.exports = router;
