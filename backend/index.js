// backend/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./db.js";

import { authenticateJWT, requirePermission, requireAdmin } from "./middleware/auth.js";

// ✅ Import all route files
import systemPreferencesRoute from "./routes/system_preferences.js";
import inventoryRoutes from "./routes/inventory.js";
import purchaseOrdersRoutes from "./routes/purchase_orders.js";
import productsRoutes from "./routes/products.js";
import purchaseOrdersBulkRouter from "./routes/purchase_orders_bulk.js";
import poImportRoutes from "./routes/po_import.js";
import vendorRoutes from "./routes/vendors.js";
import purchaseOrdersReportRoutes from "./routes/purchase_orders_report.js";
import rfqRouter from "./routes/purchase_orders_rfq.js";
import permissionsRoute from "./routes/permissions.js";
import monitoringRoutes from "./routes/monitoring.js";
import productBomUploadRoutes from "./routes/product_bom_upload.js";
import usersRoute from "./routes/users.js";
import rolesRoute from "./routes/roles.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ In-memory client heartbeat store
const clientStatus = {};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Backup health config
const BACKUP_CONFIG = {
  db: {
    label: "DB Backup",
    dir: process.env.DB_BACKUP_DIR || "C:/PSR/backups/db",
    maxAgeHours: Number(process.env.DB_BACKUP_MAX_AGE_HOURS || 24),
  },
  files: {
    label: "Files Backup",
    dir: process.env.FILES_BACKUP_DIR || "C:/PSR/backups/files",
    maxAgeHours: Number(process.env.FILES_BACKUP_MAX_AGE_HOURS || 24),
  },
  weekly: {
    label: "Weekly Backup",
    dir: process.env.WEEKLY_BACKUP_DIR || "C:/PSR/backups/weekly",
    maxAgeHours: Number(process.env.WEEKLY_BACKUP_MAX_AGE_HOURS || 24 * 8),
  },
};

function getLatestEntryFromDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return null;
  }

  const entries = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() || entry.isDirectory())
    .map((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      const stat = fs.statSync(fullPath);

      return {
        name: entry.name,
        fullPath,
        mtime: stat.mtime,
        size: stat.isFile() ? stat.size : 0,
        entryType: entry.isDirectory() ? "directory" : "file",
      };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return entries[0] || null;
}

function buildBackupHealth(configKey) {
  const cfg = BACKUP_CONFIG[configKey];
  const latest = getLatestEntryFromDir(cfg.dir);

  if (!latest) {
    return {
      httpStatus: 500,
      body: {
        ok: false,
        status: "MISSING",
        message: `${cfg.label} not found`,
        backupType: configKey,
        directory: cfg.dir,
      },
    };
  }

  const ageHours = (Date.now() - latest.mtime.getTime()) / (1000 * 60 * 60);
  const isFresh = ageHours <= cfg.maxAgeHours;

  return {
    httpStatus: isFresh ? 200 : 500,
    body: {
      ok: isFresh,
      status: isFresh ? "OK" : "STALE",
      message: isFresh ? `${cfg.label} healthy` : `${cfg.label} stale`,
      backupType: configKey,
      directory: cfg.dir,
      latestFile: latest.name,
      latestFilePath: latest.fullPath,
      entryType: latest.entryType,
      lastModified: latest.mtime,
      ageHours: Number(ageHours.toFixed(2)),
      maxAgeHours: cfg.maxAgeHours,
      sizeBytes: latest.size,
    },
  };
}

// ✅ Middleware setup
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ✅ Static route for uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ✅ Connect DB
connectDB();

// ✅ Mount API routes
app.use("/api/parts", inventoryRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/users", usersRoute); // login/open routes

app.use("/api/parts", authenticateJWT, inventoryRoutes);
app.use("/api/vendors", authenticateJWT, vendorRoutes);
app.use("/api/roles", authenticateJWT, rolesRoute);
app.use("/api/system-preferences", authenticateJWT, systemPreferencesRoute);
app.use("/api/permissions", authenticateJWT, permissionsRoute);

app.use("/api/purchase_orders", purchaseOrdersRoutes);
app.use("/api/purchase_orders", rfqRouter);
app.use("/api/purchase_orders_bulk", purchaseOrdersBulkRouter);
app.use("/api/po_import", poImportRoutes);
app.use("/api/purchase_orders_report", purchaseOrdersReportRoutes);
app.use("/api/products/:id/bom", productBomUploadRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/monitoring", monitoringRoutes);

// ✅ Health check
app.get("/", (req, res) => {
  res.send("🚀 PSR Inventory Management API is running successfully...");
});

// ✅ Client Health Reporting
app.post("/api/client-health", (req, res) => {
  const { clientName, status, machineIp } = req.body;

  if (!clientName) {
    return res.status(400).json({
      ok: false,
      message: "clientName is required",
    });
  }

  clientStatus[clientName] = {
    status: status || "UNKNOWN",
    machineIp: machineIp || "",
    lastSeen: new Date(),
  };

  return res.json({
    ok: true,
    message: "Client status updated",
    clientName,
    machineIp: clientStatus[clientName].machineIp,
    lastSeen: clientStatus[clientName].lastSeen,
    status: clientStatus[clientName].status,
  });
});

app.get("/api/client-health/:clientName", (req, res) => {
  const clientName = req.params.clientName;
  const record = clientStatus[clientName];

  if (!record) {
    return res.status(500).json({
      ok: false,
      message: "No data from client",
      clientName,
      status: "NO_DATA",
    });
  }

  const ageMinutes =
    (Date.now() - new Date(record.lastSeen).getTime()) / (1000 * 60);

  // 15-minute schedule + small buffer
  if (ageMinutes > 20 || record.status !== "OK") {
    return res.status(500).json({
      ok: false,
      message: "Client stale or app issue",
      clientName,
      machineIp: record.machineIp,
      lastSeen: record.lastSeen,
      status: "STALE",
      ageMinutes: Number(ageMinutes.toFixed(2)),
    });
  }

  return res.status(200).json({
    ok: true,
    message: "Client healthy",
    clientName,
    machineIp: record.machineIp,
    lastSeen: record.lastSeen,
    status: "OK",
    ageMinutes: Number(ageMinutes.toFixed(2)),
  });
});

// ✅ Backup health endpoints
app.get("/api/backup-health", (req, res) => {
  try {
    const result = buildBackupHealth("db");
    return res.status(result.httpStatus).json(result.body);
  } catch (err) {
    console.error("DB BACKUP HEALTH ERROR:", err);
    return res.status(500).json({
      ok: false,
      status: "ERROR",
      message: "DB backup health check failed",
    });
  }
});

app.get("/api/files-backup-health", (req, res) => {
  try {
    const result = buildBackupHealth("files");
    return res.status(result.httpStatus).json(result.body);
  } catch (err) {
    console.error("FILES BACKUP HEALTH ERROR:", err);
    return res.status(500).json({
      ok: false,
      status: "ERROR",
      message: "Files backup health check failed",
    });
  }
});

app.get("/api/weekly-backup-health", (req, res) => {
  try {
    const result = buildBackupHealth("weekly");
    return res.status(result.httpStatus).json(result.body);
  } catch (err) {
    console.error("WEEKLY BACKUP HEALTH ERROR:", err);
    return res.status(500).json({
      ok: false,
      status: "ERROR",
      message: "Weekly backup health check failed",
    });
  }
});

// ✅ 404 handler (must always be last)
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API route not found" });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running at: http://localhost:${PORT}`);
});