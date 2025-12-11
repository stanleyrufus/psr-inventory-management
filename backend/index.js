// backend/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./db.js";

// ✅ Import all route files
import systemPreferencesRoute from "./routes/system_preferences.js";
import inventoryRoutes from "./routes/inventory.js";
import purchaseOrdersRoutes from "./routes/purchase_orders.js";
import productsRoutes from "./routes/products.js";
import purchaseOrdersBulkRouter from "./routes/purchase_orders_bulk.js";
import purchaseOrderImportRoutes from "./routes/purchase_orders_import.js";
import vendorRoutes from "./routes/vendors.js"; // ✅ single correct import
import purchaseOrdersReportRoutes from "./routes/purchase_orders_report.js";
import rfqRouter from "./routes/purchase_orders_rfq.js";   // ✅ ADD THIS
import permissionsRoute from "./routes/permissions.js";
import monitoringRoutes from "./routes/monitoring.js";


import usersRoute from "./routes/users.js";
import rolesRoute from "./routes/roles.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Middleware setup
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ✅ Static route for uploaded files
// ✅ Serve uploaded images from /uploads folder
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

// ✅ Connect DB
connectDB();

// ✅ Mount API routes (clean separation, no overlaps)
app.use("/api/parts", inventoryRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/users", usersRoute);
app.use("/api/roles", rolesRoute);
app.use("/api/system-preferences", systemPreferencesRoute);
app.use("/api/permissions", permissionsRoute);



// --- Purchase Orders core + bulk ---
app.use("/api/purchase_orders", purchaseOrdersRoutes);
app.use("/api/purchase_orders", rfqRouter);
app.use("/api/purchase_orders_bulk", purchaseOrdersBulkRouter);

// --- Dedicated Import routes (now safe, isolated path) ---
app.use("/api/po_import", purchaseOrderImportRoutes);

// Reports PO
app.use("/api/purchase_orders_report", purchaseOrdersReportRoutes);

// --- Other modules ---
app.use("/api/products", productsRoutes);

app.use("/api/monitoring", monitoringRoutes);


// ✅ Health check
app.get("/", (req, res) => {
  res.send("🚀 PSR Inventory Management API is running successfully...");
});

// ✅ 404 handler (must always be last)
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API route not found" });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running at: http://localhost:${PORT}`);
});
