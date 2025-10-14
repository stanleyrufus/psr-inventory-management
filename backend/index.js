require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { authenticateJWT } = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routers
const usersRouter = require('./routes/users');
const productsRouter = require('./routes/products');
const partsRouter = require('./routes/inventory'); // frontend /parts
const salesRouter = require('./routes/sales_orders');
const purchaseRouter = require('./routes/purchase_orders');

// Health check
app.get('/', (req, res) => {
  res.send('✅ PSR Inventory Management API is running');
});

// Public route: login/register
app.use('/users', usersRouter);

// Protected routes: require JWT
app.use('/products', authenticateJWT, productsRouter);
app.use('/parts', authenticateJWT, partsRouter);
app.use('/sales_orders', authenticateJWT, salesRouter);
app.use('/purchase_orders', authenticateJWT, purchaseRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
