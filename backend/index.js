const express = require("express");
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Import route modules
const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");
const inventoryRoutes = require("./routes/inventory");
const salesOrderRoutes = require("./routes/sales_orders");
const purchaseOrderRoutes = require("./routes/purchase_orders");

// Mount routes WITHOUT /api prefix
app.use("/users", userRoutes);
app.use("/products", productRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/sales_orders", salesOrderRoutes);
app.use("/purchase_orders", purchaseOrderRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
