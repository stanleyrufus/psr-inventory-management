// backend/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./db.js";

// ✅ Import all route files
import inventoryRoutes from "./routes/inventory.js";
import usersRoutes from "./routes/users.js";
import purchaseOrdersRoutes from "./routes/purchase_orders.js";
import suppliersRoutes from "./routes/suppliers.js";
import productsRoutes from "./routes/products.js";
import purchaseOrdersBulkRouter from "./routes/purchase_orders_bulk.js"; // ✅ New route for PO bulk upload

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Resolve current directory (for ES module path handling)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static route for uploaded files (PDFs, images, etc.)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ✅ Connect to PostgreSQL database
connectDB();

// ✅ Mount all API routes
app.use("/api/parts", inventoryRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/purchase_orders", purchaseOrdersRoutes);
app.use("/api/purchase_orders", purchaseOrdersBulkRouter); // ✅ Mount bulk upload route under same PO path
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/products", productsRoutes);

// ✅ Health check route
app.get("/", (req, res) => {
  res.send("🚀 PSR Inventory Management API is running successfully...");
});

// ✅ Global 404 handler (for unrecognized routes)
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API route not found" });
});

// ✅ Start Express server
app.listen(PORT, () => {
  console.log(`✅ Backend server running at: http://localhost:${PORT}`);
});
