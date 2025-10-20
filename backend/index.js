// backend/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./db.js";

// ✅ Existing routes
import inventoryRoutes from "./routes/inventory.js";
import usersRoutes from "./routes/users.js";
import purchaseOrdersRoutes from "./routes/purchase_orders.js";

// ✅ Newly added suppliers route
import suppliersRoutes from "./routes/suppliers.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Resolve current directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static route for uploaded PO files (PDFs, attachments, etc.)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ✅ Connect to PostgreSQL
connectDB();

// ✅ Mount API routes
app.use("/api/parts", inventoryRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/purchase_orders", purchaseOrdersRoutes);
app.use("/api/suppliers", suppliersRoutes); // ← added this line

// ✅ Health check route
app.get("/", (req, res) => {
  res.send("PSR Inventory Management API is running...");
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
