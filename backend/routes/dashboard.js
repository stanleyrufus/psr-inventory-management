import express from 'express';
// import knex from '../db/knex.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const partsCount = await knex('parts').count('id as total').first();
    const vendorsCount = await knex('vendors').count('id as total').first();
    const poCount = await knex('purchase_orders').count('id as total').first();

    res.json({
      parts: partsCount.total || 0,
      vendors: vendorsCount.total || 0,
      purchaseOrders: poCount.total || 0
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ message: 'Failed to load dashboard data' });
  }
});

export default router;
