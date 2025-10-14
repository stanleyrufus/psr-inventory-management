const express = require('express');
const router = express.Router();
const knex = require('../knex');

// Utility: auto-generate product_code like PROD-<timestamp>
const generateProductCode = () => `PROD-${Date.now()}`;

// ✅ GET all products
router.get('/', async (req, res) => {
  try {
    const products = await knex('products').select('*');
    res.json({ message: 'Product list', products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// ✅ GET product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await knex('products').where({ product_id: id }).first();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// ✅ POST create new product (auto-generates product_code if missing)
router.post('/', async (req, res) => {
  try {
    const {
      product_name,
      description,
      category,
      model_number,
      dimensions,
      weight_kg,
      price,
      status
    } = req.body;

    if (!product_name) {
      return res.status(400).json({ message: 'Product name is required' });
    }

    const product_code = generateProductCode();

    const [newProduct] = await knex('products')
      .insert({
        product_name,
        product_code,
        description,
        category,
        model_number,
        dimensions,
        weight_kg,
        price,
        status: status || 'Active'
      })
      .returning('*');

    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// ✅ PUT update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const updated = await knex('products')
      .where({ product_id: id })
      .update(updatedData)
      .returning('*');

    if (updated.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product updated successfully', product: updated[0] });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// ✅ DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await knex('products').where({ product_id: id }).del();
    if (!deleted) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

module.exports = router;
