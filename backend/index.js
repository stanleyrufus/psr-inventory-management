// /backend/server.js
require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

// Routers
const productsRouter = require('./routes/products');
const inventoryRouter = require('./routes/inventory');
const salesRouter = require('./routes/sales_orders');
const purchaseRouter = require('./routes/purchase_orders');
const usersRouter = require('./routes/users');

// Middleware
app.use(cors());
app.use(express.json());

// Mount routers
app.use('/products', productsRouter);
app.use('/inventory', inventoryRouter);
app.use('/sales', salesRouter);
app.use('/purchase', purchaseRouter);
app.use('/users', usersRouter);

// Health check
app.get('/', (req, res) => {
  res.send('PSR Inventory Management API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
